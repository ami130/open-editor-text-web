/**
 * /api/admin/packages/default — read (GET) + change (POST) the package served
 * to UNLICENSED visitors.
 *
 * This is the most consequential setting in the admin panel: it decides what
 * every anonymous editor on the internet can do. The backend enforces
 * package.read / package.update and refuses a package granting no features;
 * this route only proxies, so the two cannot drift.
 */
import { NextResponse } from 'next/server';
import { backendAuthed } from '@/lib/backend';
import { requireAdminApi } from '@/lib/dal';
import { csrfGuard } from '@/lib/csrf';

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const res = await backendAuthed('/admin/packages/default/current', { method: 'GET' });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = await request.text();
  const res = await backendAuthed('/admin/packages/default', { method: 'POST', body });
  return NextResponse.json(res.ok ? res.data : { error: res.error }, { status: res.status });
}
