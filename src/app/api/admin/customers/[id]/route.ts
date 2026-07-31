/**
 * /api/admin/customers/:id — edit (PATCH) + remove (DELETE). Proxies to the
 * backend, which enforces customer.update / customer.delete. In Next 16
 * dynamic route params are async (a Promise).
 */
import { NextResponse } from 'next/server';
import { backendAuthed } from '@/lib/backend';
import { requireAdminApi } from '@/lib/dal';
import { csrfGuard } from '@/lib/csrf';

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await request.text();
  const res = await backendAuthed(`/admin/customers/${encodeURIComponent(id)}`, { method: 'PATCH', body });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;
  const res = await backendAuthed(`/admin/customers/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
