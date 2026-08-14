/** GET /api/admin/engine/versions — every published (version, plan) row. */
import { NextResponse } from 'next/server';
import { backendAuthed } from '@/lib/backend';
import { requireAdminApi } from '@/lib/dal';

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const res = await backendAuthed('/admin/engine/versions', { method: 'GET' });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
