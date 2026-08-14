"use client";

/** Packages: list existing + a "create package" form where the admin picks
 *  sellable features and sets a price. Mirrors the CKEditor/Jodit model. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete, money, type Feature, type Package } from "./types";
import EditPackageDialog from "./EditPackageDialog";
import DefaultPackageCard from "./DefaultPackageCard";
import { useToasts, PageHeader, Card, Badge, Button, confirmAction } from "./ui";

/** "Core basics" preset — a sane always-usable baseline so an admin doesn't
 *  accidentally ship a near-empty editor. Ids match the unified catalog; any
 *  not present in the fetched features are simply ignored. */
const CORE_BASICS = [
  "text.bold", "text.italic", "text.underline",
  "paragraph.headings", "list.bullet", "list.ordered", "color.text",
];

/** Preferred display order for the feature groups (unlisted groups follow, A–Z). */
const GROUP_ORDER = [
  "Text formatting", "Font", "Color", "Paragraph", "Lists", "Insert", "Tools",
  "AI", "Export & Import", "Collaboration", "Premium",
];
function groupRank(g: string): number {
  const i = GROUP_ORDER.indexOf(g);
  return i === -1 ? GROUP_ORDER.length : i;
}

export default function PackagesPanel() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // create-form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("49.00");
  const [interval, setInterval] = useState("once");
  const [isFree, setIsFree] = useState(false);
  const [publiclyListed, setPubliclyListed] = useState(false);
  /**
   * LICENCE PROTECTION — three settings that existed only as backend defaults.
   * Without inputs here an admin could not turn them on at all, so the seat cap
   * (§2.4) was unreachable and every package silently allowed unlimited domains
   * and unlimited machines.
   *
   * Defaults mirror the backend exactly (domainBound true, caps 0 = unlimited)
   * so adding the UI changes nothing for existing behaviour.
   */
  const [domainBound, setDomainBound] = useState(true);
  const [maxDomains, setMaxDomains] = useState("0");
  const [maxInstalls, setMaxInstalls] = useState("0");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // per-row state: which package is being edited, toggle/delete in-flight ids
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<Set<string>>(new Set());
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const { notify, ToastHost } = useToasts();

  // load() performs no synchronous setState before its first await, so calling
  // it from the mount effect doesn't trigger a cascading render (satisfies
  // react-hooks/set-state-in-effect). loading/error are seeded via initial state.
  const load = useCallback(async () => {
    try {
      const [pkgs, feats] = await Promise.all([
        apiGet<Package[]>("/api/admin/packages"),
        apiGet<Feature[]>("/api/admin/features?sellable=true"),
      ]);
      setError(null); setPackages(pkgs); setFeatures(feats);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    // Defer to a microtask so the effect body itself performs no setState
    // synchronously; `active` guards against a StrictMode double-invoke / unmount.
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);
  function reload() { setLoading(true); void load(); }

  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function clearAll() { setPicked(new Set()); }
  // Presets (locked decision): "Full" = everything; "Core basics" = a baseline.
  function selectFull() { setPicked(new Set(features.map((f) => f.id))); }
  function selectCoreBasics() {
    const avail = new Set(features.map((f) => f.id));
    setPicked(new Set(CORE_BASICS.filter((id) => avail.has(id))));
  }
  function toggleGroup(items: Feature[], on: boolean) {
    setPicked((prev) => {
      const n = new Set(prev);
      for (const f of items) { if (on) n.add(f.id); else n.delete(f.id); }
      return n;
    });
  }
  function toggleCollapse(g: string) {
    setCollapsed((prev) => { const n = new Set(prev); if (n.has(g)) n.delete(g); else n.add(g); return n; });
  }

  // Features → groups (real catalog `group`), filtered by search, ordered.
  const groupedFeatures = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (f: Feature) => !q || f.title.toLowerCase().includes(q) || f.id.toLowerCase().includes(q);
    const groups = new Map<string, Feature[]>();
    for (const f of features) {
      if (!match(f)) continue;
      if (!groups.has(f.group)) groups.set(f.group, []);
      groups.get(f.group)!.push(f);
    }
    return [...groups.entries()]
      .map(([label, items]) => [label, items.sort((a, b) => a.title.localeCompare(b.title))] as const)
      .sort((a, b) => groupRank(a[0]) - groupRank(b[0]) || a[0].localeCompare(b[0]));
  }, [features, search]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setFormError(null);
    const cents = Math.round(parseFloat(price) * 100);
    if (!name.trim()) return setFormError("Name is required");
    if (!Number.isFinite(cents) || cents < 0) return setFormError("Price must be ≥ 0");
    if (picked.size === 0) return setFormError("Pick at least one feature");
    setSaving(true);
    try {
      await apiPost("/api/admin/packages", {
        name: name.trim(), priceCents: cents, // currency is USD-only (server-enforced)
        billingInterval: interval, isFree, publiclyListed, featureIds: [...picked],
        // Licence protection. 0 = unlimited on both caps, matching the backend.
        domainBound,
        maxDomains: Math.max(0, parseInt(maxDomains, 10) || 0),
        maxInstalls: Math.max(0, parseInt(maxInstalls, 10) || 0),
        // server enforces isFree ⇒ price 0 + interval once; the UI mirrors it below.
      });
      setName(""); setPrice("49.00"); setInterval("once"); setIsFree(false); setPicked(new Set()); setPubliclyListed(false);
      setDomainBound(true); setMaxDomains("0"); setMaxInstalls("0");
      notify("success", "Package created.");
      await load();
    } catch (e) { setFormError((e as Error).message); }
    finally { setSaving(false); }
  }

  function setBusy(id: string, busy: boolean) {
    setRowBusy((prev) => {
      const n = new Set(prev);
      if (busy) n.add(id); else n.delete(id);
      return n;
    });
  }
  function setRowErr(id: string, message: string | null) {
    setRowError((prev) => {
      const n = { ...prev };
      if (message) n[id] = message; else delete n[id];
      return n;
    });
  }

  /** Quick toggle for active / publiclyListed — optimistic, reverts on failure. */
  async function toggleField(pkg: Package, field: "active" | "publiclyListed") {
    const next = !pkg[field];
    setPackages((prev) => prev.map((p) => (p.id === pkg.id ? { ...p, [field]: next } : p)));
    setBusy(pkg.id, true); setRowErr(pkg.id, null);
    try {
      await apiPatch(`/api/admin/packages/${pkg.id}`, { [field]: next });
      const label = field === "active" ? (next ? "activated" : "deactivated") : (next ? "shown on website" : "hidden from website");
      notify("success", `"${pkg.name}" ${label}.`);
    } catch (e) {
      setPackages((prev) => prev.map((p) => (p.id === pkg.id ? { ...p, [field]: !next } : p))); // revert
      const msg = (e as Error).message; setRowErr(pkg.id, msg); notify("error", `Update failed: ${msg}`);
    } finally { setBusy(pkg.id, false); }
  }

  async function removePackage(pkg: Package) {
    if (!confirmAction(`Delete package "${pkg.name}"? This cannot be undone. Existing licenses issued from it are unaffected.`)) return;
    setBusy(pkg.id, true); setRowErr(pkg.id, null);
    try {
      await apiDelete(`/api/admin/packages/${pkg.id}`);
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
      notify("success", `"${pkg.name}" deleted.`);
    } catch (e) {
      const msg = (e as Error).message; setRowErr(pkg.id, msg); notify("error", `Delete failed: ${msg}`);
      setBusy(pkg.id, false);
    }
  }

  if (loading) return <p style={{ color: "var(--ink-muted)" }}>Loading…</p>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      {/* existing packages */}
      <section>
        <PageHeader title="Packages" subtitle={`${packages.length} package${packages.length === 1 ? "" : "s"}`} />

        {/*
          The free tier sits ABOVE the package list on purpose: it is the only
          setting here that affects people who have not bought anything — every
          anonymous editor loading from this backend — so it should not look
          like a per-row detail.
        */}
        <DefaultPackageCard packages={packages} onChanged={() => void reload()} />
        {packages.length === 0 && <Card><p className="text-center text-sm" style={{ color: "var(--ink-muted)" }}>No packages yet — create one on the right.</p></Card>}
        <div className="flex flex-col gap-3">
          {packages.map((p) => {
            const busy = rowBusy.has(p.id);
            return (
              <Card key={p.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: "var(--ink)" }}>{p.name}</span>
                    {p.active ? <Badge tone="good">active</Badge> : <Badge tone="neutral">inactive</Badge>}
                    {p.publiclyListed && <Badge tone="brand">on website</Badge>}
                    {p.isFree && <Badge tone="neutral">free</Badge>}
                  </div>
                  <span className="text-sm font-medium tabular-nums" style={{ color: "var(--ink)" }}>{money(p.priceCents, p.currency)} · {p.billingInterval}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.features.map((f) => (
                    <span key={f.id} className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--paper-raised)", border: "1px solid var(--edge)", color: "var(--ink-muted)" }}>{f.title}</span>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 border-t pt-3 text-sm" style={{ color: "var(--ink)", borderColor: "var(--edge)" }}>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={p.active} disabled={busy} onChange={() => toggleField(p, "active")} />
                    Active
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={p.publiclyListed} disabled={busy} onChange={() => toggleField(p, "publiclyListed")} />
                    Show on website
                  </label>
                  <span className="ml-auto flex gap-2">
                    <Button size="sm" onClick={() => setEditingId(p.id)}>Edit</Button>
                    <Button size="sm" variant="danger" disabled={busy} onClick={() => removePackage(p)}>Delete</Button>
                  </span>
                </div>
                {rowError[p.id] && <p role="alert" className="mt-1 text-xs" style={{ color: "#c5221f" }}>{rowError[p.id]}</p>}
              </Card>
            );
          })}
        </div>
      </section>

      {editingId && (() => {
        const pkg = packages.find((p) => p.id === editingId);
        if (!pkg) return null;
        return (
          <EditPackageDialog
            pkg={pkg}
            features={features}
            onClose={() => setEditingId(null)}
            onSaved={(updated) => {
              setPackages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
              setEditingId(null);
              notify("success", `"${updated.name}" updated.`);
            }}
          />
        );
      })()}

      {/* create form */}
      <section>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>New package</h3>
        <Card>
        <form onSubmit={create} className="flex flex-col gap-3">
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className="oe-input" placeholder="Pro" /></Field>
          <label className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--ink)" }}>
            <input
              type="checkbox" checked={isFree}
              onChange={(e) => {
                const on = e.target.checked; setIsFree(on);
                if (on) { setPrice("0.00"); setInterval("once"); }
                // Un-checking clears the coerced 0 so a real price must be entered
                // (empty fails validation) — no silently-$0 "paid" package.
                else if (price === "0.00") setPrice("");
              }}
            />
            Free / comp package <span className="font-normal" style={{ color: "var(--ink-muted)" }}>(price 0, one-time — for licenses YOU issue to someone for free; it is NOT sold or shown on your public pricing page)</span>
          </label>
          <Field label="Price (USD)">
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--ink-muted)" }}>$</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} className="oe-input" inputMode="decimal" disabled={isFree} />
            </div>
          </Field>
          <Field label="Billing">
            <select value={interval} onChange={(e) => setInterval(e.target.value)} className="oe-input" disabled={isFree}>
              <option value="once">One-time</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="lifetime">Lifetime</option>
            </select>
          </Field>
          {/*
            LICENCE PROTECTION — grouped and labelled in plain language.

            These three had no UI at all, so every package silently took the
            backend defaults: domain binding always on, and BOTH caps unlimited.
            That made the §2.4 seat cap unreachable — the protection existed and
            no admin could switch it on.

            Wording is deliberately about consequences ("one payment, one site")
            rather than field names, because the person choosing these is making
            a commercial decision, not a technical one.
          */}
          <fieldset className="flex flex-col gap-2.5 rounded-md p-3" style={{ border: "1px solid var(--edge)" }}>
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
              Licence protection
            </legend>

            <label className="flex items-start gap-2 text-sm font-medium" style={{ color: "var(--ink)" }}>
              <input type="checkbox" checked={domainBound} onChange={(e) => setDomainBound(e.target.checked)} className="mt-0.5" />
              <span>
                Lock to the buyer&apos;s website
                <span className="block font-normal" style={{ color: "var(--ink-muted)" }}>
                  They enter their domain at checkout and the key only works there.
                  Turn OFF and the key works on any site — including one they resell it to.
                </span>
              </span>
            </label>

            <Field label="Domains allowed">
              <input
                value={maxDomains} onChange={(e) => setMaxDomains(e.target.value)}
                className="oe-input" inputMode="numeric" disabled={!domainBound}
              />
              <span className="mt-0.5 block text-xs" style={{ color: "var(--ink-muted)" }}>
                0 = unlimited. Use 1 for &ldquo;one payment, one site&rdquo;.
                {!domainBound && " (Not used while the domain lock is off.)"}
              </span>
            </Field>

            <Field label="Devices allowed">
              <input
                value={maxInstalls} onChange={(e) => setMaxInstalls(e.target.value)}
                className="oe-input" inputMode="numeric"
              />
              <span className="mt-0.5 block text-xs" style={{ color: "var(--ink-muted)" }}>
                0 = unlimited. Counts distinct browsers, so 3&ndash;5 covers a normal
                team while a key shared in a group chat stops working. A device that
                already worked is never cut off.
              </span>
            </Field>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                Features ({picked.size}/{features.length} selected)
              </span>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={selectFull} className="rounded px-1.5 py-0.5 hover:underline" style={{ color: "var(--brand)" }}>Full</button>
                <button type="button" onClick={selectCoreBasics} className="rounded px-1.5 py-0.5 hover:underline" style={{ color: "var(--brand)" }}>Core basics</button>
                <button type="button" onClick={clearAll} className="rounded px-1.5 py-0.5 hover:underline" style={{ color: "var(--ink-muted)" }}>Clear</button>
              </div>
            </div>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="oe-input" placeholder="Search features…"
            />
            <div className="flex max-h-96 flex-col gap-2 overflow-y-auto rounded-lg p-2" style={{ border: "1px solid var(--edge)" }}>
              {groupedFeatures.length === 0 && <p className="p-1 text-xs" style={{ color: "var(--ink-muted)" }}>No features match.</p>}
              {groupedFeatures.map(([label, items]) => {
                const pickedCount = items.filter((f) => picked.has(f.id)).length;
                const allOn = pickedCount === items.length;
                const isCollapsed = collapsed.has(label);
                return (
                  <fieldset key={label} className="flex flex-col gap-1 rounded-md p-1.5" style={{ border: "1px solid var(--edge)" }}>
                    <div className="flex items-center gap-2">
                      {/* parent checkbox toggles the whole group */}
                      <input
                        type="checkbox" checked={allOn}
                        ref={(el) => { if (el) el.indeterminate = pickedCount > 0 && !allOn; }}
                        onChange={() => toggleGroup(items, !allOn)}
                        aria-label={`Select all ${label}`}
                      />
                      <button type="button" onClick={() => toggleCollapse(label)}
                        className="flex flex-1 items-center justify-between text-left text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: "var(--ink-muted)" }}>
                        <span>{label} <span style={{ color: "var(--ink-muted)" }}>({pickedCount}/{items.length})</span></span>
                        <span aria-hidden>{isCollapsed ? "▸" : "▾"}</span>
                      </button>
                    </div>
                    {!isCollapsed && (
                      <div className="ml-5 flex flex-col gap-1">
                        {items.map((f) => (
                          <label key={f.id} className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
                            <input type="checkbox" checked={picked.has(f.id)} onChange={() => toggle(f.id)} />
                            {f.title}
                            {f.kind === "premium" && <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: "color-mix(in oklab, var(--brand) 12%, var(--paper))", color: "var(--brand)" }}>premium</span>}
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>
                );
              })}
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm font-medium" style={{ color: "var(--ink)" }}>
            <input type="checkbox" className="mt-0.5" checked={publiclyListed} onChange={(e) => setPubliclyListed(e.target.checked)} />
            <span>
              List on public pricing page
              <span className="block font-normal text-xs" style={{ color: "var(--ink-muted)" }}>
                Off by default — a new package will NOT appear on your website until you tick this (you can also flip it later from the package list).
              </span>
            </span>
          </label>
          {formError && <p role="alert" className="text-sm" style={{ color: "#c5221f" }}>{formError}</p>}
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Creating…" : "Create package"}
          </Button>
        </form>
        </Card>
      </section>
      <ToastHost />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>
      {label}
      {children}
    </label>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg px-3 py-2 text-sm" style={{ background: "color-mix(in oklab, #e53935 12%, var(--paper))", color: "#c5221f" }}>
      {message}{onRetry && <button onClick={onRetry} className="ml-2 underline">retry</button>}
    </div>
  );
}
