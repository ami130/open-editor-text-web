/**
 * customer-session.ts — the BFF session for the self-serve CUSTOMER portal
 * (Phase 4b). Simpler than the admin session (session.ts): it holds only the
 * backend's short-lived customer-session token in Next's OWN httpOnly cookie.
 *
 * There is no refresh chain — a customer session is short-lived and single
 * purpose; when it expires the customer just requests a new magic link (cheap).
 * So on a backend 401 we clear the cookie and the UI sends them to sign in.
 *
 * SECURITY: httpOnly + Secure + SameSite=strict (browser JS can never read it,
 * never sent cross-site). The backend re-verifies the customer token's
 * signature/type/expiry on every /portal call — the cookie is not trusted for
 * authorization here, only to carry the token server-side.
 *
 * cookies() is ASYNC in Next 16 — always awaited.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { CUSTOMER_SESSION_COOKIE, CUSTOMER_SESSION_MAX_AGE_MS } from './config';

const isProd = process.env.NODE_ENV === 'production';

export async function setCustomerSession(token: string): Promise<void> {
  const store = await cookies();
  store.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: Math.floor(CUSTOMER_SESSION_MAX_AGE_MS / 1000),
  });
}

export async function getCustomerToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CUSTOMER_SESSION_COOKIE)?.value ?? null;
}

export async function clearCustomerSession(): Promise<void> {
  const store = await cookies();
  store.delete(CUSTOMER_SESSION_COOKIE);
}
