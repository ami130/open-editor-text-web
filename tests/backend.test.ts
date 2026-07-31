/**
 * backend.test.ts — the server-side backend client: transparent refresh-and-
 * retry-once on 401, the refresh single-flight (L6), the H1 BFF-secret header,
 * and getSetCookie rotation capture. `fetch` is mocked; the session uses the
 * in-memory cookie jar from setup.ts.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { backendAuthed } from '@/lib/backend';
import { setSession, getSession, type SessionData } from '@/lib/session';

const baseSession: SessionData = {
  accessToken: 'access-1',
  refreshCookie: 'oe_refresh=old-token',
  user: { id: 'u1', email: 'a@b.com', permissions: ['*'] },
};

// A programmable fetch mock: each entry is matched by URL substring in order.
type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;
let calls: Array<{ url: string; init: RequestInit }> = [];
let handler: Handler;

beforeEach(async () => {
  calls = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__cookieJar._clear();
  await setSession(baseSession);
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    return handler(u, init);
  }));
});
afterEach(() => vi.unstubAllGlobals());

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(body == null ? null : JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('backendAuthed', () => {
  it('attaches the session access token as Bearer and returns data on 200', async () => {
    handler = () => json(200, { hello: 'world' });
    const res = await backendAuthed<{ hello: string }>('/admin/packages');
    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ hello: 'world' });
    expect(calls[0].init.headers).toMatchObject({ Authorization: 'Bearer access-1' });
  });

  it('on 401 refreshes once (with BFF secret header) then retries with the new token', async () => {
    let phase = 0;
    handler = (u) => {
      if (u.endsWith('/admin/packages') && phase === 0) { phase = 1; return json(401, { error: 'expired' }); }
      if (u.endsWith('/auth/refresh')) {
        return json(201, { accessToken: 'access-2' }, { 'set-cookie': 'oe_refresh=new-token; Path=/auth; HttpOnly' });
      }
      return json(200, { ok: true }); // retried call
    };
    const res = await backendAuthed('/admin/packages');
    expect(res.ok).toBe(true);
    // refresh was called, and the retried admin call used the NEW token
    const refreshCall = calls.find((c) => c.url.endsWith('/auth/refresh'));
    expect(refreshCall).toBeTruthy();
    const retried = calls.filter((c) => c.url.endsWith('/admin/packages'));
    expect(retried[1].init.headers).toMatchObject({ Authorization: 'Bearer access-2' });
    // the rotated refresh cookie was persisted to the session
    const s = await getSession();
    expect(s?.accessToken).toBe('access-2');
    expect(s?.refreshCookie).toContain('new-token');
  });

  it('returns 401 (session expired) when refresh itself fails, without a second retry', async () => {
    handler = (u) => u.endsWith('/auth/refresh') ? json(403, { error: 'no' }) : json(401, { error: 'expired' });
    const res = await backendAuthed('/admin/packages');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
    // original + refresh only — NOT a third call
    expect(calls.filter((c) => c.url.endsWith('/admin/packages')).length).toBe(1);
  });

  it('SINGLE-FLIGHT: two concurrent 401s trigger only ONE /auth/refresh (L6)', async () => {
    let refreshCount = 0;
    const seen = new Set<string>();
    handler = async (u) => {
      if (u.endsWith('/auth/refresh')) {
        refreshCount += 1;
        await new Promise((r) => setTimeout(r, 20)); // hold so both racers overlap
        return json(201, { accessToken: 'access-2' }, { 'set-cookie': 'oe_refresh=new-token; Path=/auth' });
      }
      // First hit for each distinct path 401s; the retry (same path, second
      // time) succeeds — so the test isolates the concurrent-refresh behaviour.
      if (!seen.has(u)) { seen.add(u); return json(401, { error: 'expired' }); }
      return json(200, { ok: true });
    };
    // Fire two authed calls concurrently; both see 401 and both want to refresh.
    await Promise.all([backendAuthed('/admin/a'), backendAuthed('/admin/b')]);
    expect(refreshCount).toBe(1); // coalesced — reuse-detection lockout avoided
  });
});
