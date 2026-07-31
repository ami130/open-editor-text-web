/**
 * /api/portal/licenses — the authenticated customer's licenses (safe fields, no
 * token). Attaches the customer-session token from the httpOnly cookie. A 401
 * clears the stale cookie so the UI can send the customer to sign in again.
 */
import { NextResponse } from 'next/server';
import { backendCustomer } from '@/lib/backend';
import { getCustomerToken, clearCustomerSession } from '@/lib/customer-session';

export async function GET() {
  const token = await getCustomerToken();
  const res = await backendCustomer('/portal/licenses', token, { method: 'GET' });
  if (res.status === 401) await clearCustomerSession();
  // Per-customer data — never cache in a shared cache (audit, defense-in-depth).
  return NextResponse.json(res.ok ? res.data : { error: res.error }, {
    status: res.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
