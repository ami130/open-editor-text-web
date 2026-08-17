/** Shared types + a tiny fetch helper for the admin dashboard (browser side).
 *  All calls hit Next's same-origin /api/admin/* routes (never the backend
 *  directly), so the session cookie authenticates them automatically. */

export interface Feature { id: string; title: string; group: string; kind: "core" | "plugin" | "premium"; deprecated: boolean; sellable: boolean; }
export interface Package {
  id: string; name: string; description: string; priceCents: number; currency: string;
  billingInterval: string; domainBound: boolean; active: boolean; publiclyListed: boolean;
  /** Phase 3 — storefront "free" label (server coerces price 0 + interval once). */
  isFree?: boolean;
  /** Phase 3 — derived from billingInterval; consumed by the Phase-4 refresh endpoint. */
  refreshPolicy?: string;
  features: Feature[];
}
export interface Customer { id: string; name: string; email: string; domains: string[]; }
export interface Permission { key: string; description: string; }
export interface Role {
  id: string; name: string; description: string; system: boolean;
  permissions: Permission[];
}
export interface AdminUser {
  id: string; email: string; name: string; active: boolean;
  roles: { id: string; name: string }[]; permissions: string[];
}
export interface Order {
  id: string; status: "pending" | "fulfilled" | "failed" | "expired";
  packageName: string; amountCents: number; currency: string;
  customerEmail: string; customerName: string; domains: string[];
  licenseId: string | null; licenseDelivered: boolean; createdAt: string;
  stalePending: boolean;
}
export interface License {
  id: string; licId: string; planName: string; status: string; effectiveStatus: string;
  features: string[]; domains: string[]; issuedAt: number; expiresAt: number;
  customer?: Customer; token?: string;
  /** Phase 5c anti-sharing soft flag: unix seconds it tripped (0 = not flagged) +
   *  a human-readable reason. Flagged licenses KEEP WORKING; admin reviews/dismisses. */
  flaggedAt?: number; flagReason?: string;
  /**
   * WHICH key signed this licence (Phase 4b). A licence issued by one
   * environment cannot verify against a bundle carrying another's keyring — it
   * silently resolves to the free tier, which has already happened here. Shown
   * in the list, flagged when it does not match the backend in use.
   */
  kid?: string;
  /**
   * Which engine BUILD this licence resolves to (§1.2). The chain is
   * `pin → override → channel default → global default`, so an empty pin or
   * override means "fall through to the next step".
   *
   * The backend has always returned these; they were simply never typed here,
   * so the panel could not show or edit them.
   */
  channel?: string;
  pinnedVersion?: string;
  overrideVersion?: string;
  overrideReason?: string;
  overrideReviewAt?: number;
}

/** GET/POST helpers that throw a readable Error on non-2xx. */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export async function apiPost<T>(path: string, payload?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export async function apiPatch<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: "DELETE" });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export function money(cents: number, currency: string): string {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100); }
  catch { return `${(cents / 100).toFixed(2)} ${currency}`; }
}
