/**
 * /api/portal/verify — consume a magic-link token. On success the backend
 * returns the customer-session token; we store it in Next's OWN httpOnly cookie
 * (the browser never sees it) and return only { ok, email }.
 */
import { NextResponse } from 'next/server';
import { backendRaw } from '@/lib/backend';
import { csrfGuard } from '@/lib/csrf';
import { setCustomerSession } from '@/lib/customer-session';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const body = await request.text();
  const res = await backendRaw('/portal/verify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
  });
  const data = await res.json().catch(() => ({})) as { ok?: boolean; email?: string; sessionToken?: string; error?: string };

  if (res.ok && data.sessionToken) {
    await setCustomerSession(data.sessionToken);
    // Strip the token from the browser-facing response — it lives only in the
    // httpOnly cookie now.
    return NextResponse.json({ ok: true, email: data.email });
  }
  return NextResponse.json({ error: data.error || 'invalid or expired link' }, { status: res.status || 401 });
}
