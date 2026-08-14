"use client";

/** Customers: search, list + create (name, email, registered domains for
 *  domain-bound licenses), inline edit, delete. Presentation uses the shared
 *  admin UI kit; all data logic (search/create/edit/delete) is unchanged. */
import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete, type Customer } from "./types";
import { ErrorBox } from "./PackagesPanel";
import { PageHeader, Card, Table, Th, Td, EmptyRow, Button, useToasts, confirmAction } from "./ui";

export default function CustomersPanel() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [domains, setDomains] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDomains, setEditDomains] = useState("");
  const [rowBusy, setRowBusy] = useState<Set<string>>(new Set());
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const { notify, ToastHost } = useToasts();

  const load = useCallback(async (q: string) => {
    try {
      const path = q.trim() ? `/api/admin/customers?q=${encodeURIComponent(q.trim())}` : "/api/admin/customers";
      const list = await apiGet<Customer[]>(path);
      setError(null); setCustomers(list);
    }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(""); });
    return () => { active = false; if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [load]);
  function reload() { setLoading(true); void load(search); }

  function onSearchChange(value: string) {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => { setLoading(true); void load(value); }, 300);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault(); setFormError(null);
    if (!name.trim() || !email.trim()) return setFormError("Name and email are required");
    setSaving(true);
    try {
      await apiPost("/api/admin/customers", {
        name: name.trim(), email: email.trim(),
        domains: domains.split(",").map((d) => d.trim()).filter(Boolean),
      });
      setName(""); setEmail(""); setDomains("");
      notify("success", "Customer created.");
      await load(search);
    } catch (e) { setFormError((e as Error).message); }
    finally { setSaving(false); }
  }

  function startEdit(c: Customer) {
    setEditingId(c.id); setEditName(c.name); setEditEmail(c.email); setEditDomains(c.domains.join(", "));
  }
  function cancelEdit() { setEditingId(null); }

  function setBusy(id: string, busy: boolean) {
    setRowBusy((prev) => { const n = new Set(prev); if (busy) n.add(id); else n.delete(id); return n; });
  }
  function setRowErr(id: string, message: string | null) {
    setRowError((prev) => { const n = { ...prev }; if (message) n[id] = message; else delete n[id]; return n; });
  }

  async function saveEdit(id: string) {
    if (!editName.trim() || !editEmail.trim()) return setRowErr(id, "Name and email are required");
    setBusy(id, true); setRowErr(id, null);
    try {
      const updated = await apiPatch<Customer>(`/api/admin/customers/${id}`, {
        name: editName.trim(), email: editEmail.trim(),
        domains: editDomains.split(",").map((d) => d.trim()).filter(Boolean),
      });
      setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
      notify("success", "Customer updated.");
    } catch (e) { const msg = (e as Error).message; setRowErr(id, msg); notify("error", `Update failed: ${msg}`); }
    finally { setBusy(id, false); }
  }

  async function removeCustomer(c: Customer) {
    if (!confirmAction(`Delete customer "${c.name}" (${c.email})? This does not delete their licenses/orders.`)) return;
    setBusy(c.id, true); setRowErr(c.id, null);
    try {
      await apiDelete(`/api/admin/customers/${c.id}`);
      setCustomers((prev) => prev.filter((x) => x.id !== c.id));
      notify("success", `"${c.name}" deleted.`);
    } catch (e) {
      const msg = (e as Error).message; setRowErr(c.id, msg); notify("error", `Delete failed: ${msg}`);
      setBusy(c.id, false);
    }
  }

  if (error) return <ErrorBox message={error} onRetry={reload} />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section>
        <PageHeader title="Customers" subtitle={`${customers.length} customer${customers.length === 1 ? "" : "s"}`} />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="oe-input mb-4"
          placeholder="Search by name or email…"
        />
        {loading ? (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading…</p>
        ) : (
          <Table head={<><Th>Name</Th><Th>Email</Th><Th>Domains</Th><Th align="right">Actions</Th></>}>
            {customers.length === 0 ? (
              <EmptyRow cols={4}>{search ? "No customers match." : "No customers yet."}</EmptyRow>
            ) : customers.map((c) => {
              const busy = rowBusy.has(c.id);
              const isEditing = editingId === c.id;
              if (isEditing) {
                return (
                  <tr key={c.id}>
                    <Td><input value={editName} onChange={(e) => setEditName(e.target.value)} className="oe-input w-full" placeholder="Name" /></Td>
                    <Td><input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="oe-input w-full" placeholder="Email" type="email" /></Td>
                    <Td><input value={editDomains} onChange={(e) => setEditDomains(e.target.value)} className="oe-input w-full" placeholder="a.com, b.com" /></Td>
                    <Td align="right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="primary" disabled={busy} onClick={() => saveEdit(c.id)}>{busy ? "…" : "Save"}</Button>
                        <Button size="sm" disabled={busy} onClick={cancelEdit}>Cancel</Button>
                      </div>
                      {rowError[c.id] && <p role="alert" className="mt-1 text-xs" style={{ color: "#c5221f" }}>{rowError[c.id]}</p>}
                    </Td>
                  </tr>
                );
              }
              return (
                <tr key={c.id}>
                  <Td><span className="font-medium" style={{ color: "var(--ink)" }}>{c.name}</span></Td>
                  <Td><span style={{ color: "var(--ink-muted)" }}>{c.email}</span></Td>
                  <Td>
                    {c.domains.length > 0
                      ? <span className="text-xs" style={{ color: "var(--ink-muted)" }}>{c.domains.join(", ")}</span>
                      : <span className="text-xs" style={{ color: "var(--ink-muted)" }}>—</span>}
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => startEdit(c)}>Edit</Button>
                      <Button size="sm" variant="danger" disabled={busy} onClick={() => removeCustomer(c)}>Delete</Button>
                    </div>
                    {rowError[c.id] && <p role="alert" className="mt-1 text-xs" style={{ color: "#c5221f" }}>{rowError[c.id]}</p>}
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>New customer</h3>
        <Card>
          <form onSubmit={create} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>Name<input value={name} onChange={(e) => setName(e.target.value)} className="oe-input" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="oe-input" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>
              Domains <span className="font-normal" style={{ color: "var(--ink-muted)" }}>(comma-separated)</span>
              <input value={domains} onChange={(e) => setDomains(e.target.value)} className="oe-input" placeholder="acme.com, app.acme.com" />
            </label>
            {formError && <p role="alert" className="text-sm" style={{ color: "#c5221f" }}>{formError}</p>}
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Creating…" : "Create customer"}</Button>
          </form>
        </Card>
      </section>
      <ToastHost />
    </div>
  );
}
