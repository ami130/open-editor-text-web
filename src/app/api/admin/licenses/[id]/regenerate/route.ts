/**
 * POST /api/admin/licenses/:id/regenerate — revoke the old license and mint a
 * fresh one for the same customer/features/domains (backend enforces
 * license.revoke + license.issue). Returns the NEW license (incl. its signed
 * token — shown once, same as a normal issue). In Next 16 dynamic route
 * params are async (a Promise).
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
  const res = await backendAuthed(`/admin/licenses/${encodeURIComponent(id)}/regenerate`, { method: 'POST' });
  // Response carries a fresh bearer token — never cache/store (audit #8).
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
}
