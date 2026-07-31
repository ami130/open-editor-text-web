/**
 * permissions.ts — the SINGLE source of truth for interpreting the backend's
 * permission strings on the frontend.
 *
 * Deliberately NOT server-only: the same predicate is used by the server DAL
 * (dal.ts), the optimistic proxy (proxy.ts), and the login page's client-side
 * redirect (login/page.tsx). Keeping one copy prevents the three-way drift that
 * previously let `feature.read` mean "admin" in one place and "not admin" in
 * another.
 *
 * These functions only decide OPTIMISTIC routing / UI gating. They are never
 * the authorization boundary — the backend re-verifies the token and enforces
 * RBAC on every data call.
 */

/** Permission prefixes that grant access to the admin area. */
const ADMIN_RESOURCES = ['package', 'license', 'customer', 'role', 'user', 'feature', 'order'] as const;

const ADMIN_PERM_RE = new RegExp(`^(${ADMIN_RESOURCES.join('|')})\\.`);

/** The wildcard, or any admin-scoped permission (e.g. `package.read`), implies
 *  admin-area access. Kept identical everywhere via this one function. */
export function hasAdminAccess(perms: string[] | undefined | null): boolean {
  if (!perms) return false;
  if (perms.includes('*')) return true;
  return perms.some((p) => ADMIN_PERM_RE.test(p));
}

/** True if the permission set holds a specific permission (or the wildcard). */
export function hasPermission(perms: string[] | undefined | null, permission: string): boolean {
  if (!perms) return false;
  return perms.includes('*') || perms.includes(permission);
}
