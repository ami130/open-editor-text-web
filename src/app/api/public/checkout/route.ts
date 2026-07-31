/**
 * POST /api/public/checkout — start a Stripe Checkout (no auth, but same-origin
 * CSRF-guarded). Forwards the buyer's package/email/domains to the backend,
 * which validates + creates the session, and returns the Stripe redirect URL.
 * The price is NEVER sent from here — the backend takes it from the DB package.
 */
import { NextResponse } from 'next/server';
import { backendRaw } from '@/lib/backend';
import { csrfGuard } from '@/lib/csrf';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const body = await request.text();
  const res = await backendRaw('/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const parsed = await res.json().catch(() => null);
  return NextResponse.json(parsed ?? { error: 'checkout failed' }, { status: res.status });
}
