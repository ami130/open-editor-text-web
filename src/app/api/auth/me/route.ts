/**
 * GET /api/auth/me — the current session's minimal user snapshot, for the
 * browser to render "who am I / what can I do". Reads Next's session cookie
 * (server-side); returns 401 if unauthenticated. Not an authorization source —
 * /admin data calls are still gated by the backend on every request.
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  // Per-session data — never cache in a shared cache (audit, defense-in-depth).
  return NextResponse.json({ user: session.user }, { headers: { 'Cache-Control': 'no-store' } });
}
