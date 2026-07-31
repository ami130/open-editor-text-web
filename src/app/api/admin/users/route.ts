/**
 * /api/admin/users — list (GET) + create (POST) admin (staff) users. Backend
 * enforces user.read / user.manage, hashes the password, and never returns it.
 */
import { NextResponse } from 'next/server';
import { backendAuthed } from '@/lib/backend';
import { requireAdminApi } from '@/lib/dal';
import { csrfGuard } from '@/lib/csrf';

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const res = await backendAuthed('/admin/users', { method: 'GET' });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = await request.text();
  const res = await backendAuthed('/admin/users', { method: 'POST', body });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
