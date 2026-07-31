/**
 * session.ts — the BFF session, stored in Next's OWN httpOnly cookie.
 *
 * SECURITY MODEL:
 *   • The cookie holds the backend's access + refresh tokens + a minimal user
 *     snapshot (id/email/perms) used ONLY for optimistic routing (proxy.ts).
 *   • It is httpOnly + Secure + SameSite=strict → browser JS can never read it
 *     (XSS-safe), and strict means it is NEVER sent on any cross-site request
 *     (top-level navigation included), which is the CSRF baseline for an
 *     admin-only panel. State-changing routes additionally assert the request
 *     Origin (see lib/csrf.ts) for defense-in-depth.
 *   • The snapshot is NOT trusted for authorization — the backend re-verifies
 *     the access token (signature + tokenVersion + active) on EVERY /admin call
 *     (Phase D C1). So a tampered cookie can't grant access; at worst it routes
 *     optimistically, then the backend rejects. Real authz lives at the data
 *     source (dal.ts + backend RBAC), per the Next auth guidance.
 *
 * cookies() is ASYNC in Next 16 — always awaited.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from './config';

export interface SessionUser {
  id: string;
  email: string;
  permissions: string[];
}

export interface SessionData {
  accessToken: string;
  refreshCookie: string; // the backend's Set-Cookie refresh value (opaque to us)
  user: SessionUser;
}

const isProd = process.env.NODE_ENV === 'production';

/** Encode session data for the cookie (base64 JSON; integrity comes from the
 *  httpOnly flag + backend re-verification, not from this encoding). */
function encode(data: SessionData): string {
  return Buffer.from(JSON.stringify(data), 'utf8').toString('base64url');
}
function decode(raw: string): SessionData | null {
  try {
    const obj = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (obj && typeof obj.accessToken === 'string' && obj.user && typeof obj.user.id === 'string') {
      return obj as SessionData;
    }
  } catch { /* fall through */ }
  return null;
}

/** Write the session cookie. */
export async function setSession(data: SessionData): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, encode(data), {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
  });
}

/** Read + parse the current session, or null if absent/invalid. */
export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  return raw ? decode(raw) : null;
}

/** Clear the session cookie (logout). */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Read just the session from a raw cookie value (used by proxy.ts, which
 *  reads cookies from the request, not via the async cookies() store). */
export function decodeSessionValue(raw: string | undefined): SessionData | null {
  return raw ? decode(raw) : null;
}
