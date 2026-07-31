/**
 * GET /api/admin/permissions — the assignable permission catalog (wildcard
 * excluded) for the role editor's checkboxes. Backend enforces role.read.
 */
import { NextResponse } from 'next/server';
import { backendAuthed } from '@/lib/backend';
import { requireAdminApi } from '@/lib/dal';

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const res = await backendAuthed('/admin/permissions', { method: 'GET' });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
