/**
 * PATCH /api/admin/engine/versions/:version/channel — promote a build along
 * internal → beta → stable. Promotion is what makes a version reachable by
 * anyone beyond the people who opted in.
 */
import { NextResponse } from 'next/server';
import { backendAuthed } from '@/lib/backend';
import { requireAdminApi } from '@/lib/dal';
import { csrfGuard } from '@/lib/csrf';

export async function PATCH(request: Request, ctx: { params: Promise<{ version: string }> }) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { version } = await ctx.params;
  const body = await request.text();
  const res = await backendAuthed(
    `/admin/engine/versions/${encodeURIComponent(version)}/channel`,
    { method: 'PATCH', body },
  );
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
