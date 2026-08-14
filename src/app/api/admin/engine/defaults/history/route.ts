/**
 * GET /api/admin/engine/defaults/history — every release and rollback, with
 * fromVersion → toVersion, who did it and why. The audit trail behind §3.
 */
import { NextResponse } from 'next/server';
import { backendAuthed } from '@/lib/backend';
import { requireAdminApi } from '@/lib/dal';

export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const scope = new URL(request.url).searchParams.get('scope') || 'global';
  const res = await backendAuthed(
    `/admin/engine/defaults/history?scope=${encodeURIComponent(scope)}`,
    { method: 'GET' },
  );
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
