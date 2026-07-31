/**
 * dal.ts — the Data Access Layer: the REAL server-side authorization boundary
 * for admin pages (proxy.ts is only optimistic). Server Components call these
 * to require a session / admin role before rendering or fetching. Because the
 * backend re-verifies the access token on every data call, these functions are
 * the app-side gate; the backend is the ultimate authority.
 */
import 'server-only';
import { redirect } from 'next/navigation';
import { getSession, type SessionUser } from './session';
import { hasAdminAccess, hasPermission } from './permissions';

// Re-export so existing importers of `hasAdminAccess` from dal keep working.
export { hasAdminAccess };

/** Require a logged-in user; redirect to /login otherwise. Returns the user. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session!.user;
}

/** Require admin access; redirect non-admins to /profile, guests to /login. */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!hasAdminAccess(session!.user.permissions)) redirect('/profile');
  return session!.user;
}

/** True if the current session holds a specific permission (or the wildcard). */
export async function can(permission: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return hasPermission(session.user.permissions, permission);
}

/**
 * Route-handler guard (defense-in-depth for /api/admin/*). Unlike requireAdmin,
 * this returns a JSON Response to send early — it never redirects (route
 * handlers shouldn't). Returns null when the caller is an authenticated admin.
 *
 * The backend still independently enforces RBAC; this makes the BFF fail fast
 * for non-admins instead of blindly forwarding, so a logged-in non-admin can't
 * even reach the backend admin surface through this app.
 */
export async function requireAdminApi(): Promise<Response | null> {
  const session = await getSession();
  if (!session) return Response.json({ error: 'not authenticated' }, { status: 401 });
  if (!hasAdminAccess(session.user.permissions)) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }
  return null;
}
