/**
 * POST /api/auth/login — the BFF login endpoint (same-origin, browser-facing).
 *
 * Flow: take { email, password } → call backend /auth/login → on success,
 * capture the backend's access token + rotated refresh cookie + user, and store
 * them in Next's OWN httpOnly session cookie. The browser never sees the tokens
 * or the backend URL. Returns only a minimal, safe user snapshot.
 */
import { NextResponse } from 'next/server';
import { backendRaw, readRefreshCookie } from '@/lib/backend';
import { setSession } from '@/lib/session';
import { csrfGuard } from '@/lib/csrf';

export async function POST(request: Request) {
  // Reject cross-site submissions (defense-in-depth alongside SameSite=strict).
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return bad('invalid request body'); }
  const email = typeof body.email === 'string' ? body.email : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) return bad('email and password are required');

  const res = await backendRaw('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    // Pass through the backend's auth failure (401) without leaking detail.
    return NextResponse.json({ error: 'invalid credentials' }, { status: res.status === 401 ? 401 : 502 });
  }

  const data = await res.json().catch(() => null) as
    | { accessToken?: string; user?: { id: string; email: string } }
    | null;
  const refreshCookie = readRefreshCookie(res);
  if (!data?.accessToken || !data.user || !refreshCookie) {
    return NextResponse.json({ error: 'unexpected backend response' }, { status: 502 });
  }

  // Fetch the user's permissions (for optimistic role routing) via /auth/me.
  const me = await backendRaw('/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${data.accessToken}` },
  });
  const meBody = me.ok ? (await me.json().catch(() => null)) as { permissions?: string[] } | null : null;

  await setSession({
    accessToken: data.accessToken,
    refreshCookie,
    user: {
      id: data.user.id,
      email: data.user.email,
      permissions: Array.isArray(meBody?.permissions) ? meBody!.permissions : [],
    },
  });

  return NextResponse.json({
    user: { id: data.user.id, email: data.user.email },
    permissions: Array.isArray(meBody?.permissions) ? meBody!.permissions : [],
  });
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
