/**
 * /profile — a signed-in user's home (non-admin landing). Server Component:
 * requireUser() (DAL) is the real gate — it redirects guests to /login. Admins
 * are welcome here too, with a link to the admin area.
 */
import Link from "next/link";
import { requireUser, hasAdminAccess } from "@/lib/dal";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic"; // session-dependent; never statically cached

export default async function ProfilePage() {
  const user = await requireUser();
  const admin = hasAdminAccess(user.permissions);

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>Your account</h1>
        <LogoutButton />
      </div>

      <div className="card mt-6 rounded-2xl p-6" style={{ background: "var(--paper-raised)", border: "1px solid var(--edge)" }}>
        <dl className="grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
          <dt style={{ color: "var(--ink-muted)" }}>Email</dt>
          <dd style={{ color: "var(--ink)" }}>{user.email}</dd>
          <dt style={{ color: "var(--ink-muted)" }}>Account ID</dt>
          <dd className="font-mono text-xs" style={{ color: "var(--ink)" }}>{user.id}</dd>
          <dt style={{ color: "var(--ink-muted)" }}>Role</dt>
          <dd style={{ color: "var(--ink)" }}>{admin ? "Administrator" : "User"}</dd>
        </dl>
      </div>

      {admin && (
        <Link
          href="/admin"
          className="btn-primary mt-6 inline-block rounded-lg px-4 py-2 text-sm font-medium"
        >
          Go to admin dashboard →
        </Link>
      )}
    </div>
  );
}
