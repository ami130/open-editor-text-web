/**
 * admin-features-route.test.ts — Phase 4.3 BFF data-contract guard.
 *
 * GET /api/admin/features is a transparent passthrough to the backend catalog.
 * The admin tree picker relies on each feature carrying `group` and `kind`; if
 * this route (or a future "sanitize the payload" refactor) ever dropped those,
 * the tree would silently lose its grouping/badges with no type error. This
 * pins the contract: whatever shape the backend returns reaches the client
 * intact, and the admin gate is enforced first.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the auth gate and the backend client BEFORE importing the route.
const requireAdminApi = vi.fn<() => Promise<Response | null>>();
const backendAuthed = vi.fn();
vi.mock('@/lib/dal', () => ({ requireAdminApi: () => requireAdminApi() }));
vi.mock('@/lib/backend', () => ({ backendAuthed: (...a: unknown[]) => backendAuthed(...a) }));

import { GET } from '@/app/api/admin/features/route';

const SAMPLE = [
  { id: 'text.bold', title: 'Bold', group: 'Text Formatting', kind: 'core', deprecated: false, sellable: true },
  { id: 'ai.review', title: 'AI Review', group: 'AI', kind: 'premium', deprecated: false, sellable: true },
];

beforeEach(() => {
  requireAdminApi.mockReset();
  backendAuthed.mockReset();
  requireAdminApi.mockResolvedValue(null); // admin allowed
});

describe('GET /api/admin/features', () => {
  it('passes group + kind through to the client unchanged', async () => {
    backendAuthed.mockResolvedValue({ ok: true, status: 200, data: SAMPLE });
    const res = await GET(new Request('http://localhost/api/admin/features'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(SAMPLE); // group/kind/sellable all intact
    expect(body[0]).toHaveProperty('group', 'Text Formatting');
    expect(body[0]).toHaveProperty('kind', 'core');
    expect(body[1]).toHaveProperty('kind', 'premium');
    expect(backendAuthed).toHaveBeenCalledWith('/admin/features', { method: 'GET' });
  });

  it('?sellable=true routes to the sellable backend endpoint', async () => {
    backendAuthed.mockResolvedValue({ ok: true, status: 200, data: SAMPLE });
    await GET(new Request('http://localhost/api/admin/features?sellable=true'));
    expect(backendAuthed).toHaveBeenCalledWith('/admin/features/sellable', { method: 'GET' });
  });

  it('enforces the admin gate before calling the backend', async () => {
    requireAdminApi.mockResolvedValue(new Response('forbidden', { status: 403 }));
    const res = await GET(new Request('http://localhost/api/admin/features'));
    expect(res.status).toBe(403);
    expect(backendAuthed).not.toHaveBeenCalled();
  });

  it('propagates a backend error status', async () => {
    backendAuthed.mockResolvedValue({ ok: false, status: 502, error: 'upstream down' });
    const res = await GET(new Request('http://localhost/api/admin/features'));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'upstream down' });
  });
});
