/**
 * /api/admin/customers — list (GET, forwards ?q= search) + create (POST).
 * Proxies to the backend (customer.read / customer.create enforced there).
 */
import { NextResponse } from 'next/server';
import { backendAuthed } from '@/lib/backend';
import { requireAdminApi } from '@/lib/dal';
import { csrfGuard } from '@/lib/csrf';

export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const q = new URL(request.url).searchParams.get('q');
  const path = q ? `/admin/customers?q=${encodeURIComponent(q)}` : '/admin/customers';
  const res = await backendAuthed(path, { method: 'GET' });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = await request.text();
  const res = await backendAuthed('/admin/customers', { method: 'POST', body });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
