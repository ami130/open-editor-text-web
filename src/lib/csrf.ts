/**
 * csrf.ts — defense-in-depth CSRF guard for state-changing BFF routes.
 *
 * The session cookie is already SameSite=strict (session.ts), so browsers will
 * not attach it to any cross-site request. This adds a second, independent
 * check: every mutating /api/auth/* and /api/admin/* handler asserts that the
 * request originates from this app's OWN origin, by comparing the Origin (or,
 * as a fallback, Referer) header against the request Host.
 *
 * Why both: SameSite depends on the browser honoring it; the Origin check is a
 * server-side assertion that does not. Together they close the CSRF window even
 * if a future cookie tweak or an odd client weakens SameSite.
 *
 * Server-only: relies on request headers, never runs in the browser.
 */
import 'server-only';

/**
 * Optional explicit allowlist of trusted origins (comma-separated), e.g.
 * "https://admin.example.com". When unset, same-origin (Origin host === request
 * Host) is required, which is correct for a single-origin deployment.
 */
const APP_ORIGINS = (process.env.APP_ORIGIN || '')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

/** Extract the host (host:port) from a URL-ish string, or null if unparseable. */
function hostOf(value: string): string | null {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/**
 * Returns true if the request is same-origin (or from a configured trusted
 * origin). State-changing handlers should reject when this is false.
 *
 * Rules:
 *   • If Origin is present, it must match an APP_ORIGIN, or its host must equal
 *     the request Host. (Origin is the reliable signal for fetch/XHR/form POST.)
 *   • If Origin is absent (some same-origin navigations omit it), fall back to
 *     Referer host === request Host.
 *   • If neither header is present, reject — a legitimate browser fetch to a
 *     mutating route always sends at least one of them.
 */
export function isSameOrigin(req: Request): boolean {
  const host = req.headers.get('host');
  if (!host) return false;

  const origin = req.headers.get('origin');
  if (origin) {
    if (APP_ORIGINS.includes(origin.replace(/\/+$/, ''))) return true;
    return hostOf(origin) === host;
  }

  const referer = req.headers.get('referer');
  if (referer) {
    if (APP_ORIGINS.some((o) => hostOf(o) === hostOf(referer))) return true;
    return hostOf(referer) === host;
  }

  // No Origin and no Referer on a state-changing request → treat as untrusted.
  return false;
}

/**
 * Guard for mutating route handlers. Returns a 403 Response to return early
 * when the request fails the same-origin check, or null when it is allowed.
 *
 *   const bad = csrfGuard(req); if (bad) return bad;
 */
export function csrfGuard(req: Request): Response | null {
  if (isSameOrigin(req)) return null;
  return Response.json(
    { error: 'cross-site request rejected' },
    { status: 403 },
  );
}
