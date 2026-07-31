/**
 * /api/admin/licenses — list (GET, forwards ?q= and ?status=) + issue (POST).
 * The backend's list omits the signed token (Phase D I2); issue returns the
 * token for the buyer.
 */
import { NextResponse } from 'next/server';
import { backendAuthed } from '@/lib/backend';
import { requireAdminApi } from '@/lib/dal';
import { csrfGuard } from '@/lib/csrf';

export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const qs = new URLSearchParams();
  const q = params.get('q');
  const status = params.get('status');
  if (q) qs.set('q', q);
  if (status) qs.set('status', status);
  const path = qs.size ? `/admin/licenses?${qs.toString()}` : '/admin/licenses';
  const res = await backendAuthed(path, { method: 'GET' });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = await request.text();
  const res = await backendAuthed('/admin/licenses', { method: 'POST', body });
  // Issue returns the buyer's bearer token — never cache/store (audit #8).
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
}
