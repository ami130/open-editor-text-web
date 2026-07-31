/**
 * GET /api/admin/features(/sellable) — proxy the backend feature catalog for
 * the "create package" pick-list. backendAuthed attaches the session token +
 * auto-refreshes; the backend enforces the feature.read permission.
 */
import { NextResponse } from 'next/server';
import { backendAuthed } from '@/lib/backend';
import { requireAdminApi } from '@/lib/dal';

export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const sellable = new URL(request.url).searchParams.get('sellable') === 'true';
  const res = await backendAuthed(sellable ? '/admin/features/sellable' : '/admin/features', { method: 'GET' });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
