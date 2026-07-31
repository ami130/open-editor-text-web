/**
 * /api/portal/licenses/[id]/key — reveal the CURRENT token for one of the
 * customer's own licenses. The backend enforces ownership (a foreign id → 404).
 * Dynamic route params are ASYNC in Next 16 — await ctx.params.
 */
import { NextResponse } from 'next/server';
import { backendCustomer } from '@/lib/backend';
import { getCustomerToken, clearCustomerSession } from '@/lib/customer-session';

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = await getCustomerToken();
  const res = await backendCustomer(`/portal/licenses/${encodeURIComponent(id)}/key`, token, { method: 'GET' });
  if (res.status === 401) await clearCustomerSession();
  // The body carries a bearer license token — forbid any caching/storage
  // (proxies, bfcache) as defense-in-depth (audit L1).
  return NextResponse.json(res.ok ? res.data : { error: res.error }, {
    status: res.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
