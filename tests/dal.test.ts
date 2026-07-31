/**
 * dal.test.ts — the route-handler authz guard requireAdminApi(): the defense-in-
 * depth gate on /api/admin/* BFF routes. 401 when unauthenticated, 403 for a
 * non-admin session, null (pass) for an admin. Uses the mocked cookie jar.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { requireAdminApi, can } from '@/lib/dal';
import { setSession, clearSession, type SessionData } from '@/lib/session';

const adminSession: SessionData = {
  accessToken: 'a', refreshCookie: 'oe_refresh=x',
  user: { id: 'u1', email: 'admin@b.com', permissions: ['*'] },
};
const nonAdminSession: SessionData = {
  accessToken: 'a', refreshCookie: 'oe_refresh=x',
  user: { id: 'u2', email: 'user@b.com', permissions: ['profile.read'] },
};

beforeEach(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__cookieJar._clear();
});

describe('requireAdminApi', () => {
  it('no session → 401 Response', async () => {
    await clearSession();
    const res = await requireAdminApi();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('authenticated NON-admin → 403 Response', async () => {
    await setSession(nonAdminSession);
    const res = await requireAdminApi();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it('admin → null (allowed through)', async () => {
    await setSession(adminSession);
    const res = await requireAdminApi();
    expect(res).toBeNull();
  });
});

describe('can', () => {
  it('true for a held permission / wildcard, false otherwise', async () => {
    await setSession(adminSession);
    expect(await can('anything')).toBe(true); // wildcard
    await setSession(nonAdminSession);
    expect(await can('profile.read')).toBe(true);
    expect(await can('package.delete')).toBe(false);
  });
  it('no session → false', async () => {
    await clearSession();
    expect(await can('profile.read')).toBe(false);
  });
});
