/**
 * POST /api/admin/licenses/:id/rebind-domains — rebind a license to new domains
 * and email the customer the new key (Phase 5d; backend enforces license.revoke +
 * license.issue). Body: { domains: string[] }. Next 16 dynamic params are async.
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
  const body = await request.text();
  const res = await backendAuthed(`/admin/licenses/${encodeURIComponent(id)}/rebind-domains`, { method: 'POST', body });
  // On email-fail the body carries the new bearer token — never cache/store (audit #8).
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
}
