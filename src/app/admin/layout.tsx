/**
 * /admin layout — the admin area shell. requireAdmin() (DAL) is the real gate:
 * it redirects guests → /login and non-admins → /profile BEFORE any admin child
 * renders. (proxy.ts already did the optimistic redirect; this is the
 * authoritative server-side check.)
 */
import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
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
