/**
 * /api/portal/licenses/[id]/regenerate — revoke the customer's current key and
 * mint a fresh one (honor-snapshot, ownership-enforced by the backend). Mutating
 * → CSRF-guarded. Dynamic params are async in Next 16.
 */
import { NextResponse } from 'next/server';
import { backendCustomer } from '@/lib/backend';
import { csrfGuard } from '@/lib/csrf';
import { getCustomerToken, clearCustomerSession } from '@/lib/customer-session';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const token = await getCustomerToken();
  const res = await backendCustomer(`/portal/licenses/${encodeURIComponent(id)}/regenerate`, token, { method: 'POST' });
  if (res.status === 401) await clearCustomerSession();
  // Body carries the freshly-minted bearer token — never cache/store (audit L1).
  return NextResponse.json(res.ok ? res.data : { error: res.error }, {
    status: res.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
