/**
 * GET /api/public/orders/:sessionId/license — the success page polls this until
 * the webhook fulfills the order, then it returns the license key once.
 * Next 16: dynamic params are async (a Promise).
 */
import { NextResponse } from 'next/server';
import { backendRaw } from '@/lib/backend';

export async function GET(_request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  const res = await backendRaw(`/billing/orders/${encodeURIComponent(sessionId)}/license`, { method: 'GET' });
  const body = await res.json().catch(() => null);
  // This response can carry the license key (once) — never let a shared cache/CDN
  // store it, matching the portal key/regenerate routes (audit).
  return NextResponse.json(body ?? { status: 'unknown' }, {
    status: res.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
