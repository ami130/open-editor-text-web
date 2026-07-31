/**
 * session.test.ts — the BFF session cookie: round-trip, cookie flags, and
 * malformed/tampered-cookie handling (decodes to null, never a partial object).
 * Uses the in-memory cookie jar mock from setup.ts.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setSession, getSession, clearSession, decodeSessionValue, type SessionData } from '@/lib/session';
import { SESSION_COOKIE } from '@/lib/config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jar = () => (globalThis as any).__cookieJar as {
  _raw: (n: string) => { value: string; opts?: Record<string, unknown> } | undefined;
  _clear: () => void;
};

const sample: SessionData = {
  accessToken: 'access.jwt.token',
  refreshCookie: 'oe_refresh=abc123',
  user: { id: 'u1', email: 'a@b.com', permissions: ['*'] },
};

beforeEach(() => jar()._clear());

describe('session round-trip', () => {
  it('setSession → getSession returns the same data', async () => {
    await setSession(sample);
    const got = await getSession();
    expect(got).toEqual(sample);
  });

  it('writes an httpOnly, sameSite=strict, path=/ cookie', async () => {
    await setSession(sample);
    const raw = jar()._raw(SESSION_COOKIE);
    expect(raw?.opts?.httpOnly).toBe(true);
    expect(raw?.opts?.sameSite).toBe('strict');
    expect(raw?.opts?.path).toBe('/');
    expect(typeof raw?.opts?.maxAge).toBe('number');
  });

  it('clearSession removes it', async () => {
    await setSession(sample);
    await clearSession();
    expect(await getSession()).toBeNull();
  });
});

describe('decodeSessionValue — malformed input fails closed', () => {
  it('undefined / empty → null', () => {
    expect(decodeSessionValue(undefined)).toBeNull();
    expect(decodeSessionValue('')).toBeNull();
  });
  it('garbage / non-base64 → null', () => {
    expect(decodeSessionValue('!!!not-base64!!!')).toBeNull();
    expect(decodeSessionValue('YWJj')).toBeNull(); // "abc" — valid b64, not JSON
  });
  it('valid JSON but wrong shape → null (no partial object leaks)', () => {
    const bad = Buffer.from(JSON.stringify({ hello: 'world' }), 'utf8').toString('base64url');
    expect(decodeSessionValue(bad)).toBeNull();
    const noUser = Buffer.from(JSON.stringify({ accessToken: 'x' }), 'utf8').toString('base64url');
    expect(decodeSessionValue(noUser)).toBeNull();
  });
  it('a well-formed cookie decodes — note: content is NOT trusted for authz (backend re-verifies)', () => {
    const forged = Buffer.from(JSON.stringify({
      accessToken: 'forged', user: { id: 'x', email: 'e', permissions: ['*'] },
    }), 'utf8').toString('base64url');
    const decoded = decodeSessionValue(forged);
    // It decodes (base64 is not integrity) — the security guarantee is that the
    // backend re-verifies the (unforgeable) access token on every call, so a
    // forged snapshot only affects OPTIMISTIC routing, never real access.
    expect(decoded?.user.id).toBe('x');
  });
});
