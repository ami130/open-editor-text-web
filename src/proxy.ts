/**
 * proxy.ts — Next 16 "proxy" (formerly middleware). OPTIMISTIC role routing
 * ONLY: it reads the session cookie (never hits the DB/backend — proxy runs on
 * every request incl. prefetches, so it must stay cheap, per the Next auth
 * guide) and redirects users to the right area. It is NOT the security boundary
 * — the backend re-verifies every /admin data call (Phase D). This just avoids
 * showing the wrong shell.
 *
 *   • Unauthenticated → /login (except public paths).
 *   • Authenticated on /login → their home (/admin if admin, else /profile).
 *   • Non-admin on /admin/* → /profile.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeSessionValue } from '@/lib/session';
import { SESSION_COOKIE } from '@/lib/config';
import { hasAdminAccess } from '@/lib/permissions';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = decodeSessionValue(request.cookies.get(SESSION_COOKIE)?.value);
  const authed = !!session;
  // Optimistic admin check via the shared predicate (single source of truth).
  const admin = authed && hasAdminAccess(session!.user.permissions);

  const onLogin = pathname === '/login';
  const onAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const onProfile = pathname === '/profile' || pathname.startsWith('/profile/');

  // Guests may only see /login (among the matched routes).
  if (!authed) {
    if (onLogin) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user hitting the login page → send to their home.
  if (onLogin) {
    const url = request.nextUrl.clone();
    url.pathname = admin ? '/admin' : '/profile';
    url.searchParams.delete('next');
    return NextResponse.redirect(url);
  }

  // Non-admin trying to reach the admin area → their profile.
  if (onAdmin && !admin) {
    const url = request.nextUrl.clone();
    url.pathname = '/profile';
    return NextResponse.redirect(url);
  }

  // (Admins may visit /profile too; no redirect needed.)
  void onProfile;
  return NextResponse.next();
}

// Only run on the auth-gated areas — keep public marketing pages untouched.
export const config = {
  matcher: ['/login', '/admin/:path*', '/profile/:path*'],
};
