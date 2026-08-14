/**
 * confirm-action.test.ts — a destructive confirmation must name the environment.
 *
 * ─── WHY ────────────────────────────────────────────────────────────────────
 * The admin banner says which backend you are on, at the top of the page. The
 * confirm dialog is where the mistake actually happens: you are looking at the
 * dialog, not the banner, at the moment you decide. And these actions do not
 * undo — a revoked licence "can never be un-revoked".
 *
 * ─── THE DEFAULT THAT MATTERS ───────────────────────────────────────────────
 * An UNIDENTIFIED backend must not read as production. Silence there is what
 * makes a wrong-environment click possible, and it is the same mistake the
 * banner component already made once by rendering nothing for a null
 * environment.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/** The header logic from ui.tsx's confirmAction, mirrored for testing. */
function header(env: string, host: string) {
  return !env
    ? `⚠️ UNIDENTIFIED BACKEND${host ? ` (${host})` : ''}\n\n`
    : env === 'production'
      ? `PRODUCTION${host ? ` — ${host}` : ''}\n\n`
      : `⚠️ ${env.toUpperCase()} — NOT PRODUCTION${host ? ` (${host})` : ''}\n\n`;
}

describe('confirmAction header', () => {
  it('warns loudly on a non-production backend', () => {
    const h = header('development', '127.0.0.1:8787');
    expect(h).toContain('NOT PRODUCTION');
    expect(h).toContain('DEVELOPMENT');
    expect(h).toContain('127.0.0.1:8787');
  });

  it('still names production, rather than staying silent', () => {
    // This is the one dialog where the real environment matters most; a blank
    // header here is exactly how a wrong-environment click happens.
    const h = header('production', 'api.example.com');
    expect(h).toContain('PRODUCTION');
    expect(h).not.toContain('NOT PRODUCTION');
  });

  it('treats an UNIDENTIFIED backend as a warning, not as production', () => {
    const h = header('', 'api.example.com');
    expect(h).toContain('UNIDENTIFIED BACKEND');
    expect(h).not.toMatch(/^PRODUCTION/);
  });

  it('distinguishes two non-production backends by host', () => {
    // Two staging boxes are otherwise identical in this dialog.
    expect(header('staging', 'stg-a.example')).not.toBe(header('staging', 'stg-b.example'));
  });

  it('puts the environment BEFORE the message', () => {
    const msg = 'Revoke the license for a@b.com?';
    const full = header('staging', 'h') + msg;
    expect(full.indexOf('STAGING')).toBeLessThan(full.indexOf('Revoke'));
  });
});

describe('confirmAction wiring', () => {
  const orig = globalThis.document;
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { globalThis.document = orig; });

  it('refuses rather than proceeding when there is no document (SSR)', async () => {
    // Returning true in a non-browser context would silently approve a
    // destructive action nobody confirmed.
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../src/components/admin/ui.tsx', import.meta.url), 'utf-8'));
    expect(src).toMatch(/if \(typeof document === "undefined"\) return false;/);
  });

  it('reads the environment the SERVER published, not a client-side guess', async () => {
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../src/components/admin/ui.tsx', import.meta.url), 'utf-8'));
    expect(src).toMatch(/document\.body\?\.dataset\?\.oeEnv/);
    expect(src).toMatch(/document\.body\?\.dataset\?\.oeBackend/);
  });

  it('is used by every destructive admin action', async () => {
    const fs = await import('node:fs');
    const dir = new URL('../src/components/admin/', import.meta.url);
    const panels = fs.readdirSync(dir).filter((f) => f.endsWith('Panel.tsx'));
    for (const f of panels) {
      const src = fs.readFileSync(new URL(f, dir), 'utf-8');
      // No panel may call window.confirm directly — that is how one action
      // quietly loses its environment header.
      expect(src, `${f} calls window.confirm directly`).not.toMatch(/window\.confirm\(/);
    }
  });
});
