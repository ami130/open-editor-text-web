/**
 * backend.ts — the server-side client for open-editor-backend.
 *
 * All calls run on the Next SERVER (never the browser). Admin calls attach the
 * session's access token as `Authorization: Bearer`. On a 401 (access token
 * expired — they're short-lived), it transparently refreshes using the stored
 * backend refresh cookie, updates the Next session, and retries once.
 *
 * The browser never sees the backend URL or tokens — it only calls Next's own
 * route handlers, which use this.
 */
import 'server-only';
import { BACKEND_URL, REFRESH_COOKIE_NAME, BFF_SHARED_SECRET } from './config';
import { getSession, setSession, type SessionData } from './session';

export interface BackendResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

/** Low-level: call the backend with an explicit bearer token (no session I/O). */
async function rawCall(path: string, init: RequestInit, token?: string): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${BACKEND_URL}${path}`, { ...init, headers, cache: 'no-store' });
}

/** Parse a backend response body → { ok, status, data, error }. */
async function parse<T>(res: Response): Promise<BackendResponse<T>> {
  let body: unknown = null;
  const text = await res.text();
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  if (res.ok) return { ok: true, status: res.status, data: body as T };
  const error = (body && typeof body === 'object' && 'message' in body)
    ? String((body as { message: unknown }).message)
    : `request failed (${res.status})`;
  return { ok: false, status: res.status, data: null, error };
}

/**
 * Authenticated backend call using the current session, with one transparent
 * refresh-and-retry on 401. Returns a structured result (never throws on HTTP
 * errors — callers branch on `.ok`).
 */
export async function backendAuthed<T = unknown>(path: string, init: RequestInit = {}): Promise<BackendResponse<T>> {
  const session = await getSession();
  if (!session) return { ok: false, status: 401, data: null, error: 'not authenticated' };

  let res = await rawCall(path, init, session.accessToken);
  if (res.status === 401) {
    // Access token likely expired — try to refresh, then retry once.
    const refreshed = await tryRefresh(session);
    if (!refreshed) return { ok: false, status: 401, data: null, error: 'session expired' };
    res = await rawCall(path, init, refreshed.accessToken);
  }
  return parse<T>(res);
}

/**
 * Single-flight guard (L6): coalesce concurrent refreshes for the SAME refresh
 * cookie. Without this, two parallel requests that both 401 would each call
 * /auth/refresh with the same cookie — the second presents a now-rotated token,
 * which the backend's reuse-detection treats as theft and revokes the whole
 * session family, logging the admin out mid-work. Keyed by the current cookie
 * so a genuinely new session isn't blocked.
 */
const inflightRefresh = new Map<string, Promise<SessionData | null>>();

function tryRefresh(session: SessionData): Promise<SessionData | null> {
  const key = session.refreshCookie;
  const existing = inflightRefresh.get(key);
  if (existing) return existing;
  const p = doRefresh(session).finally(() => {
    // Clear only if we're still the owner of this key's in-flight entry.
    if (inflightRefresh.get(key) === p) inflightRefresh.delete(key);
  });
  inflightRefresh.set(key, p);
  return p;
}

/** Use the backend refresh cookie to mint a new access token; update session. */
async function doRefresh(session: SessionData): Promise<SessionData | null> {
  // This is a SERVER-TO-SERVER call (the browser never hits /auth/refresh
  // directly). Authenticate to the backend's CSRF gate with the shared BFF
  // secret — NOT a spoofable Origin header. Sending Origin:BACKEND_URL here was
  // the bug: the backend's allowlist holds the ADMIN PANEL origin, so once
  // ADMIN_CORS_ORIGINS was set in prod, refresh 403'd and admins were logged
  // out every ~15 min. (H1)
  const headers: Record<string, string> = { Cookie: session.refreshCookie };
  if (BFF_SHARED_SECRET) headers['X-BFF-Secret'] = BFF_SHARED_SECRET;
  const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
    method: 'POST',
    headers,
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null) as { accessToken?: string; user?: unknown } | null;
  if (!body?.accessToken) return null;
  // Capture the ROTATED refresh cookie. The backend rotates the refresh token on
  // every refresh and has reuse-detection that revokes the whole session family
  // if a stale token is ever replayed — so we MUST persist the new one. If the
  // response somehow carries no refresh cookie, treat the refresh as failed
  // rather than silently reusing the old (now-rotated, poisoned) token.
  const rotated = readRefreshCookie(res);
  if (!rotated) return null;
  const next: SessionData = {
    accessToken: body.accessToken,
    refreshCookie: rotated,
    user: session.user,
  };
  await setSession(next);
  return next;
}

/**
 * Read the backend's refresh cookie as a `name=value` pair from a response.
 *
 * Uses `Headers.getSetCookie()` — the array API — because undici (Node fetch)
 * folds multiple Set-Cookie values, so a plain `.get('set-cookie')` can return
 * several cookies comma-joined and mangle the value. We pick the entry for the
 * backend refresh cookie by name and strip its attributes.
 */
export function readRefreshCookie(res: Response): string | null {
  const all = res.headers.getSetCookie?.() ?? [];
  const list = all.length ? all : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : []);
  for (const raw of list) {
    const pair = raw.split(';')[0]?.trim();
    if (pair && pair.startsWith(`${REFRESH_COOKIE_NAME}=`)) return pair;
  }
  // Fallback: if only one cookie came back and we couldn't name-match, use it.
  if (list.length === 1) {
    const pair = list[0].split(';')[0]?.trim();
    return pair || null;
  }
  return null;
}

/** Unauthenticated backend call (login/refresh) — returns the raw Response so
 *  the route handler can read Set-Cookie + body. */
export function backendRaw(path: string, init: RequestInit = {}): Promise<Response> {
  return rawCall(path, init);
}

/**
 * Phase 4 — call a backend /portal route as the CUSTOMER, attaching the given
 * customer-session token as Bearer. No refresh-and-retry (customer sessions are
 * short-lived and single-use; a 401 means "sign in again"). Returns the
 * structured result; callers branch on `.ok`/`.status`.
 */
export async function backendCustomer<T = unknown>(
  path: string, token: string | null, init: RequestInit = {},
): Promise<BackendResponse<T>> {
  if (!token) return { ok: false, status: 401, data: null, error: 'not authenticated' };
  const res = await rawCall(path, init, token);
  return parse<T>(res);
}
