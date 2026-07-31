/**
 * GET /api/public/billing-status — whether self-serve checkout is available
 * (Stripe configured on the backend). Lets /pricing show buy vs "coming soon".
 */
import { NextResponse } from 'next/server';
import { backendRaw } from '@/lib/backend';

export async function GET() {
  const res = await backendRaw('/public/billing-status', { method: 'GET' });
  const body = await res.json().catch(() => ({ enabled: false }));
  return NextResponse.json(body ?? { enabled: false }, { status: res.status });
}
