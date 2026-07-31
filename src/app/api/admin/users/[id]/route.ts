/**
 * /api/admin/users/:id — update (PATCH) + delete (DELETE) admin users. Backend
 * enforces user.manage, bumps the user's token version on role/active/password
 * changes, and refuses to remove the last active administrator.
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
  const res = await backendAuthed(`/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;
  const res = await backendAuthed(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
