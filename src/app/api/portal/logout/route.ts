/**
 * /api/portal/logout — clear the customer portal session (BFF cookie). Also
 * best-effort tells the backend to clear its own cookie. CSRF-guarded.
 */
import { NextResponse } from 'next/server';
import { backendCustomer } from '@/lib/backend';
import { csrfGuard } from '@/lib/csrf';
import { getCustomerToken, clearCustomerSession } from '@/lib/customer-session';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const token = await getCustomerToken();
  await backendCustomer('/portal/logout', token, { method: 'POST' }).catch(() => undefined);
  await clearCustomerSession();
  return NextResponse.json({ ok: true });
}
