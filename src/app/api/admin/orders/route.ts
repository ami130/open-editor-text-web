/**
 * GET /api/admin/orders — read-only purchase orders for the admin (order.read).
 * Forwards ?q= (customer search) and ?status= (filter). Surfaces fulfilled +
 * failed orders; never returns a license token.
 */
import { NextResponse } from 'next/server';
import { backendAuthed } from '@/lib/backend';
import { requireAdminApi } from '@/lib/dal';

export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const qs = new URLSearchParams();
  const q = params.get('q');
  const status = params.get('status');
  if (q) qs.set('q', q);
  if (status) qs.set('status', status);
  const path = qs.size ? `/admin/orders?${qs.toString()}` : '/admin/orders';
  const res = await backendAuthed(path, { method: 'GET' });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
