"use client";

/** Admin (staff) users: list + create (email/name/password/roles) + edit
 *  (rename, toggle active, reassign roles, reset password) + delete. Passwords
 *  are write-only — the backend hashes them and never returns them. */
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete, type AdminUser, type Role } from "./types";
import { ErrorBox } from "./PackagesPanel";
import { PageHeader, Card, Badge, Button } from "./ui";

export default function UsersPanel({ canManage }: { canManage: boolean }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(true);
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [us, rs] = await Promise.all([
        apiGet<AdminUser[]>("/api/admin/users"),
        apiGet<Role[]>("/api/admin/roles"),
      ]);
      setError(null); setUsers(us); setRoles(rs);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);
  function reload() { setLoading(true); void load(); }

  function toggleRole(id: string) {
    setRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function startNew() {
    setEditingId(null); setEmail(""); setName(""); setPassword(""); setActive(true);
    setRoleIds(new Set()); setFormError(null);
  }
  function startEdit(u: AdminUser) {
    setEditingId(u.id); setEmail(u.email); setName(u.name); setPassword(""); setActive(u.active);
    setRoleIds(new Set(u.roles.map((r) => r.id))); setFormError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setFormError(null);
    setSaving(true);
    try {
      if (editingId) {
        // Only send the password when the admin actually typed a new one.
        const patch: Record<string, unknown> = { name: name.trim(), active, roleIds: [...roleIds] };
        if (password) patch.password = password;
        await apiPatch(`/api/admin/users/${editingId}`, patch);
      } else {
        if (!email.trim() || !password) return setFormError("Email and password are required");
        await apiPost("/api/admin/users", { email: email.trim(), name: name.trim(), password, roleIds: [...roleIds] });
      }
      startNew();
      await load();
    } catch (e) { setFormError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function remove(u: AdminUser) {
    if (!confirm(`Delete admin user “${u.email}”? This cannot be undone.`)) return;
    setBusyId(u.id); setRowError(null);
    try { await apiDelete(`/api/admin/users/${u.id}`); if (editingId === u.id) startNew(); await load(); }
    catch (e) { setRowError((e as Error).message); }
    finally { setBusyId(null); }
  }

  if (loading) return <p style={{ color: "var(--ink-muted)" }}>Loading…</p>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <section>
        <PageHeader title="Admin users" subtitle={`${users.length} user${users.length === 1 ? "" : "s"}`} />
        {rowError && (
          <p role="alert" className="mb-2 rounded-lg px-3 py-2 text-sm" style={{ background: "color-mix(in oklab, #e53935 12%, var(--paper))", color: "#c5221f" }}>{rowError}</p>
        )}
        <div className="flex flex-col gap-3">
          {users.map((u) => (
            <Card key={u.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium" style={{ color: "var(--ink)" }}>{u.name || u.email}</span>
                    {!u.active && <Badge tone="warn">inactive</Badge>}
                  </div>
                  <div className="mt-0.5 text-sm" style={{ color: "var(--ink-muted)" }}>{u.email}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {u.roles.length === 0
                      ? <span className="text-xs" style={{ color: "var(--ink-muted)" }}>No roles</span>
                      : u.roles.map((r) => <span key={r.id} className="rounded-full px-1.5 py-0.5 text-[11px]" style={{ background: "var(--paper-raised)", border: "1px solid var(--edge)", color: "var(--ink-muted)" }}>{r.name}</span>)}
                  </div>
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => startEdit(u)}>Edit</Button>
                    <Button size="sm" variant="danger" disabled={busyId === u.id} onClick={() => remove(u)}>{busyId === u.id ? "…" : "Delete"}</Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {canManage && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{editingId ? "Edit user" : "New admin user"}</h3>
            {editingId && <button onClick={startNew} className="text-xs font-medium hover:underline" style={{ color: "var(--brand)" }}>+ New instead</button>}
          </div>
          <Card>
          <form onSubmit={save} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>
              Email
              <input type="email" value={email} disabled={!!editingId} onChange={(e) => setEmail(e.target.value)} className="oe-input disabled:opacity-60" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>Name<input value={name} onChange={(e) => setName(e.target.value)} className="oe-input" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>
              {editingId ? "New password" : "Password"} <span className="font-normal" style={{ color: "var(--ink-muted)" }}>{editingId ? "(leave blank to keep)" : "(min 8 chars)"}</span>
              <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="oe-input" />
            </label>

            {editingId && (
              <label className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--ink)" }}>
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
              </label>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>Roles ({roleIds.size})</span>
              {roles.length === 0 && <span className="text-xs" style={{ color: "var(--ink-muted)" }}>No roles yet — create one first.</span>}
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
                  <input type="checkbox" checked={roleIds.has(r.id)} onChange={() => toggleRole(r.id)} />
                  {r.name}{r.system && <span className="text-xs" style={{ color: "var(--ink-muted)" }}> (system)</span>}
                </label>
              ))}
            </div>

            {formError && <p role="alert" className="text-sm" style={{ color: "#c5221f" }}>{formError}</p>}
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save user" : "Create user"}
            </Button>
          </form>
          </Card>
        </section>
      )}
    </div>
  );
}
