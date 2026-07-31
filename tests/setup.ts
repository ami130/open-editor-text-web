/**
 * setup.ts — vitest global setup for the web BFF unit tests.
 *
 * The lib modules under test are server-side and reach for Next runtime APIs
 * (`next/headers` cookies, `next/navigation` redirect). We mock both with a
 * controllable in-memory cookie jar + a redirect that throws a tagged error the
 * tests can assert on. `server-only` is aliased to a no-op in vitest.config.
 */
import { vi } from 'vitest';

/** In-memory cookie jar shared with tests via globalThis.__cookieJar. */
class CookieJar {
  private store = new Map<string, { value: string; opts?: Record<string, unknown> }>();
  get(name: string) { const e = this.store.get(name); return e ? { name, value: e.value } : undefined; }
  set(name: string, value: string, opts?: Record<string, unknown>) { this.store.set(name, { value, opts }); }
  delete(name: string) { this.store.delete(name); }
  // test helpers
  _raw(name: string) { return this.store.get(name); }
  _clear() { this.store.clear(); }
}

const jar = new CookieJar();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__cookieJar = jar;

vi.mock('next/headers', () => ({
  cookies: async () => jar,
}));

// redirect() throws in Next; emulate with a tagged error tests can catch.
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    const err = new Error(`REDIRECT:${url}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).__redirect = url;
    throw err;
  },
}));
