/**
 * POST /api/admin/licenses/:id/renew — re-mint a fresh token (new expiry) on
 * the SAME license row, for the same features/domains (backend enforces
 * license.renew). Unlike regenerate, the license id is unchanged — this just
 * extends the credential's lifetime. Returns the renewed license (incl. its
 * new signed token, shown once). In Next 16 dynamic route params are async.
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
  // Optional { ttlSeconds } body; backend falls back to the package TTL if absent.
  const body = await request.json().catch(() => ({}));
  const res = await backendAuthed(`/admin/licenses/${encodeURIComponent(id)}/renew`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
  // Response carries a fresh bearer token — never cache/store (audit #8).
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
}
