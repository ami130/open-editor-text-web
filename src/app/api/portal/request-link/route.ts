/**
 * /api/portal/request-link — begin a customer portal login. Proxies to the
 * backend, which emails a magic link IF the address is a known customer and
 * ALWAYS returns the same generic response (anti-enumeration). No session yet.
 */
import { NextResponse } from 'next/server';
import { backendRaw } from '@/lib/backend';
import { csrfGuard } from '@/lib/csrf';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const body = await request.text();
  const res = await backendRaw('/portal/request-link', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
