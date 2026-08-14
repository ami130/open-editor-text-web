/**
 * PATCH /api/admin/licenses/:id/delivery — which engine BUILD one licence
 * receives (channel / pin / override). The backend enforces license.update and
 * rejects an override with no reason. In Next 16 dynamic params are async.
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
  const res = await backendAuthed(
    `/admin/licenses/${encodeURIComponent(id)}/delivery`,
    { method: 'PATCH', body },
  );
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
