/**
 * POST /api/auth/logout — revoke the backend session (bumps tokenVersion, which
 * kills the access token immediately) then clear Next's session cookie.
 */
import { NextResponse } from 'next/server';
import { backendAuthed } from '@/lib/backend';
import { clearSession } from '@/lib/session';
import { csrfGuard } from '@/lib/csrf';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;
  // Best-effort backend revocation; clear the local session regardless.
  try { await backendAuthed('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
  await clearSession();
  return NextResponse.json({ ok: true });
}
