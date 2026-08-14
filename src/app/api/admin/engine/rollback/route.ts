/**
 * POST /api/admin/engine/rollback — back to the previous known-good version.
 *
 * Deliberately forwards NO version: the backend reads the target from recorded
 * history, so it cannot be mistyped under pressure. That property is the whole
 * point of the endpoint (RUNBOOK §1) and must survive having a UI in front of
 * it — this route accepts only a `reason`.
 */
import { NextResponse } from 'next/server';
import { backendAuthed } from '@/lib/backend';
import { requireAdminApi } from '@/lib/dal';
import { csrfGuard } from '@/lib/csrf';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const sent = await request.json().catch(() => ({}));
  const res = await backendAuthed('/admin/engine/rollback', {
    method: 'POST',
    body: JSON.stringify({ scope: 'global', reason: String(sent?.reason ?? '') }),
  });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
