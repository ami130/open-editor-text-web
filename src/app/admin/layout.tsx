/**
 * /admin layout — the admin area shell. requireAdmin() (DAL) is the real gate:
 * it redirects guests → /login and non-admins → /profile BEFORE any admin child
 * renders. (proxy.ts already did the optimistic redirect; this is the
 * authoritative server-side check.)
 */
import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import LogoutButton from "@/components/LogoutButton";
import EnvironmentBanner from "@/components/EnvironmentBanner";
import EnvironmentMarker from "@/components/EnvironmentMarker";
import { BACKEND_URL } from "@/lib/config";

/**
 * Ask the backend which environment it is (Phase 4).
 *
 * Deliberately NOT read from this app's own env: the question is "which
 * backend am I editing?", and only that backend can answer it honestly. A
 * frontend-side label would keep saying "production" while pointed at staging,
 * which is the exact failure this banner exists to prevent.
 *
 * Never throws — an admin panel must still render when /health is down, and an
 * unreachable backend is surfaced by the banner rather than as a crash.
 */
async function fetchEnvironment() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { cache: "no-store" });
    if (!res.ok) return { environment: null, unreachable: true };
    const body = await res.json();
    return { environment: body?.environment ?? null, unreachable: false };
  } catch {
    return { environment: null, unreachable: true };
  }
}

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const { environment, unreachable } = await fetchEnvironment();
  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      {/* Publishes the environment on <body> so client-side panels can name it
          in destructive-action confirmations without each one re-fetching. */}
      <EnvironmentMarker
        name={environment?.name ?? ""}
        host={new URL(BACKEND_URL).host}
        kid={environment?.kid ?? ""}
      />
      <EnvironmentBanner
        environment={environment}
        host={new URL(BACKEND_URL).host}
        unreachable={unreachable}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-lg text-lg font-bold"
            style={{ background: "color-mix(in oklab, var(--brand) 16%, transparent)", color: "var(--brand)" }}
          >
            ⬢
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>OpenEditor Admin</h1>
            <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/profile" className="text-sm hover:underline" style={{ color: "var(--ink-muted)" }}>Profile</Link>
          <LogoutButton />
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
