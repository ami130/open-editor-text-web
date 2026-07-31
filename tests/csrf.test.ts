/**
 * csrf.test.ts — the same-origin/CSRF guard on mutating BFF routes.
 * Pure logic; no mocks. Covers same-origin accept, cross-site reject, the
 * Referer fallback, default-port normalization, and the fail-closed
 * "no Origin AND no Referer" case.
 */
import { describe, it, expect } from 'vitest';
import { isSameOrigin, csrfGuard } from '@/lib/csrf';

function req(headers: Record<string, string>): Request {
  return new Request('http://x/api', { headers });
}

describe('isSameOrigin', () => {
  it('accepts a same-origin fetch (Origin host === Host)', () => {
    expect(isSameOrigin(req({ host: 'admin.app.com', origin: 'https://admin.app.com' }))).toBe(true);
  });

  it('rejects a cross-site Origin', () => {
    expect(isSameOrigin(req({ host: 'admin.app.com', origin: 'https://evil.com' }))).toBe(false);
  });

  it('normalizes default ports (https:443 Origin vs bare Host)', () => {
    expect(isSameOrigin(req({ host: 'admin.app.com', origin: 'https://admin.app.com:443' }))).toBe(true);
  });

  it('falls back to Referer when Origin is absent', () => {
    expect(isSameOrigin(req({ host: 'admin.app.com', referer: 'https://admin.app.com/page' }))).toBe(true);
    expect(isSameOrigin(req({ host: 'admin.app.com', referer: 'https://evil.com/page' }))).toBe(false);
  });

  it('fails closed when neither Origin nor Referer is present', () => {
    expect(isSameOrigin(req({ host: 'admin.app.com' }))).toBe(false);
  });

  it('fails closed with no Host', () => {
    expect(isSameOrigin(req({ origin: 'https://admin.app.com' }))).toBe(false);
  });
});

describe('csrfGuard', () => {
  it('returns null (allow) for a same-origin request', () => {
    expect(csrfGuard(req({ host: 'a.com', origin: 'https://a.com' }))).toBeNull();
  });

  it('returns a 403 Response for a cross-site request', async () => {
    const res = csrfGuard(req({ host: 'a.com', origin: 'https://evil.com' }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    expect(await res!.json()).toMatchObject({ error: expect.any(String) });
  });
});
