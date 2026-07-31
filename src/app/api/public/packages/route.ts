/**
 * GET /api/public/packages — public storefront listing (no auth). Proxies the
 * backend's @Public /public/packages. Safe fields only (backend filters).
 */
import { NextResponse } from 'next/server';
import { backendRaw } from '@/lib/backend';

export async function GET() {
  const res = await backendRaw('/public/packages', { method: 'GET' });
  const body = await res.json().catch(() => null);
  return NextResponse.json(body ?? [], { status: res.status });
}
