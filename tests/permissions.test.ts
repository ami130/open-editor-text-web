/**
 * permissions.test.ts — the single shared admin-detection predicate used by the
 * DAL, proxy, and login page. A drift here is a real authz-routing bug.
 */
import { describe, it, expect } from 'vitest';
import { hasAdminAccess, hasPermission } from '@/lib/permissions';

describe('hasAdminAccess', () => {
  it('wildcard grants admin', () => {
    expect(hasAdminAccess(['*'])).toBe(true);
  });
  it('any admin-scoped permission grants admin', () => {
    for (const p of ['package.read', 'license.issue', 'customer.read', 'role.read', 'user.manage', 'feature.read', 'order.read']) {
      expect(hasAdminAccess([p])).toBe(true);
    }
  });
  it('a non-admin permission does NOT grant admin', () => {
    expect(hasAdminAccess(['profile.read'])).toBe(false);
    expect(hasAdminAccess(['something.else'])).toBe(false);
  });
  it('empty / null / undefined is not admin', () => {
    expect(hasAdminAccess([])).toBe(false);
    expect(hasAdminAccess(null)).toBe(false);
    expect(hasAdminAccess(undefined)).toBe(false);
  });
  it('does not match a permission that merely CONTAINS an admin word', () => {
    // must be prefix.<resource>. — not a substring
    expect(hasAdminAccess(['notpackage.read'])).toBe(false);
    expect(hasAdminAccess(['mypackagexread'])).toBe(false);
  });
});

describe('hasPermission', () => {
  it('wildcard holds everything', () => {
    expect(hasPermission(['*'], 'anything.at.all')).toBe(true);
  });
  it('exact match', () => {
    expect(hasPermission(['role.manage'], 'role.manage')).toBe(true);
    expect(hasPermission(['role.read'], 'role.manage')).toBe(false);
  });
  it('empty/null safe', () => {
    expect(hasPermission([], 'x')).toBe(false);
    expect(hasPermission(null, 'x')).toBe(false);
  });
});
