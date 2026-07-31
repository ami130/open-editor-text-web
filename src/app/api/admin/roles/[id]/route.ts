/**
 * /api/admin/roles/:id — update (PATCH) + delete (DELETE). Backend enforces
 * role.manage and refuses to touch system roles / roles still in use.
 * Next 16: dynamic params are async (a Promise).
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
  const res = await backendAuthed(`/admin/roles/${encodeURIComponent(id)}`, { method: 'PATCH', body });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;
  const res = await backendAuthed(`/admin/roles/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
