"use client";

/** Roles: list existing roles + create a role by picking permissions from the
 *  catalog (grouped by resource) + edit a role's permission set + delete a
 *  non-system role. System roles (seeded "admin") are read-only here. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete, type Permission, type Role } from "./types";
import { ErrorBox } from "./PackagesPanel";
import { PageHeader, Card, Badge, Button, confirmAction } from "./ui";

export default function RolesPanel({ canManage }: { canManage: boolean }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [rs, ps] = await Promise.all([
        apiGet<Role[]>("/api/admin/roles"),
        apiGet<Permission[]>("/api/admin/permissions"),
      ]);
      setError(null); setRoles(rs); setPermissions(ps);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);
  function reload() { setLoading(true); void load(); }

  // Permissions grouped by their resource prefix (package / license / …).
  const grouped = useMemo(() => {
    const g: Record<string, Permission[]> = {};
    for (const p of permissions) {
      const resource = p.key.split(".")[0];
      (g[resource] ||= []).push(p);
    }
    return g;
  }, [permissions]);

  function toggle(key: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function startNew() {
    setEditingId(null); setName(""); setDescription(""); setPicked(new Set()); setFormError(null);
  }
  function startEdit(role: Role) {
    setEditingId(role.id); setName(role.name); setDescription(role.description);
    setPicked(new Set(role.permissions.map((p) => p.key))); setFormError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setFormError(null);
    if (!name.trim()) return setFormError("Role name is required");
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim(), permissions: [...picked] };
      if (editingId) await apiPatch(`/api/admin/roles/${editingId}`, payload);
      else await apiPost("/api/admin/roles", payload);
      startNew();
      await load();
    } catch (e) { setFormError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function remove(role: Role) {
    if (!confirmAction(`Delete role “${role.name}”? This cannot be undone.`)) return;
    setBusyId(role.id); setRowError(null);
    try { await apiDelete(`/api/admin/roles/${role.id}`); if (editingId === role.id) startNew(); await load(); }
    catch (e) { setRowError((e as Error).message); }
    finally { setBusyId(null); }
  }

  if (loading) return <p style={{ color: "var(--ink-muted)" }}>Loading…</p>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <section>
        <PageHeader title="Roles" subtitle={`${roles.length} role${roles.length === 1 ? "" : "s"}`} />
        {rowError && (
          <p role="alert" className="mb-2 rounded-lg px-3 py-2 text-sm" style={{ background: "color-mix(in oklab, #e53935 12%, var(--paper))", color: "#c5221f" }}>{rowError}</p>
        )}
        <div className="flex flex-col gap-3">
          {roles.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: "var(--ink)" }}>{r.name}</span>
                    {r.system && <Badge tone="neutral">system</Badge>}
                  </div>
                  {r.description && <div className="mt-0.5 text-sm" style={{ color: "var(--ink-muted)" }}>{r.description}</div>}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {r.system
                      ? <span className="text-xs" style={{ color: "var(--ink-muted)" }}>All permissions</span>
                      : r.permissions.length === 0
                        ? <span className="text-xs" style={{ color: "var(--ink-muted)" }}>No permissions</span>
                        : r.permissions.map((p) => <span key={p.key} className="rounded-full px-1.5 py-0.5 text-[11px]" style={{ background: "var(--paper-raised)", border: "1px solid var(--edge)", color: "var(--ink-muted)" }}>{p.key}</span>)}
                  </div>
                </div>
                {canManage && !r.system && (
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => startEdit(r)}>Edit</Button>
                    <Button size="sm" variant="danger" disabled={busyId === r.id} onClick={() => remove(r)}>{busyId === r.id ? "…" : "Delete"}</Button>
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
            <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{editingId ? "Edit role" : "New role"}</h3>
            {editingId && <button onClick={startNew} className="text-xs font-medium hover:underline" style={{ color: "var(--brand)" }}>+ New instead</button>}
          </div>
          <Card>
          <form onSubmit={save} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>Name<input value={name} onChange={(e) => setName(e.target.value)} className="oe-input" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>Description<input value={description} onChange={(e) => setDescription(e.target.value)} className="oe-input" /></label>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>Permissions ({picked.size})</span>
              {Object.entries(grouped).map(([resource, perms]) => (
                <fieldset key={resource} className="rounded-lg p-2.5" style={{ border: "1px solid var(--edge)" }}>
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>{resource}</legend>
                  <div className="flex flex-col gap-1">
                    {perms.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
                        <input type="checkbox" checked={picked.has(p.key)} onChange={() => toggle(p.key)} />
                        <span className="font-mono text-xs">{p.key}</span>
                        <span style={{ color: "var(--ink-muted)" }}>— {p.description}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            {formError && <p role="alert" className="text-sm" style={{ color: "#c5221f" }}>{formError}</p>}
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save role" : "Create role"}
            </Button>
          </form>
          </Card>
        </section>
      )}
    </div>
  );
}
