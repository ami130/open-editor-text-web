/**
 * /api/admin/packages — list (GET) + create (POST). Proxies to the backend,
 * which validates the DTO (price/currency/interval/sellable features) and
 * enforces package.read / package.create. Bodies pass through unchanged.
 */
import { NextResponse } from 'next/server';
import { backendAuthed } from '@/lib/backend';
import { requireAdminApi } from '@/lib/dal';
import { csrfGuard } from '@/lib/csrf';

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const res = await backendAuthed('/admin/packages', { method: 'GET' });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = await request.text();
  const res = await backendAuthed('/admin/packages', { method: 'POST', body });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
