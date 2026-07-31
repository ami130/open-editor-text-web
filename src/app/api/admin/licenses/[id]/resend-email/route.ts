/**
 * POST /api/admin/licenses/:id/resend-email — re-send a minted license's key
 * to its customer by email (SMTP-failure recovery). Backend enforces
 * license.issue (re-delivering a bearer token is as sensitive as issuing one)
 * and returns { delivered, to }. In Next 16 dynamic route params are async.
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
  const res = await backendAuthed(`/admin/licenses/${encodeURIComponent(id)}/resend-email`, { method: 'POST' });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
