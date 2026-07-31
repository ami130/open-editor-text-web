/**
 * POST /api/admin/orders/:id/force-fulfill — recover a paid-but-stuck order.
 * Proxies to the backend (which retrieves the Stripe session, confirms it was
 * PAID, then mints + emails idempotently — never a free license). The backend
 * enforces the `license.issue` permission. Next 16: params are async.
 */
import { NextResponse } from 'next/server';
import { backendAuthed } from '@/lib/backend';
import { requireAdminApi } from '@/lib/dal';
import { csrfGuard } from '@/lib/csrf';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;
  const res = await backendAuthed(`/admin/orders/${encodeURIComponent(id)}/force-fulfill`, { method: 'POST' });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, {
    status: res.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
