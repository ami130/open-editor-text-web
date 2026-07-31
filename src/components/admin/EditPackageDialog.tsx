"use client";

/** Edit-package modal: same feature tree picker as the create form, seeded
 *  from the existing package. A self-contained dialog so PackagesPanel's
 *  create-form state isn't disturbed by editing a different package. */
import { useEffect, useMemo, useState } from "react";
import { apiPatch, type Feature, type Package } from "./types";
import { Badge, Button } from "./ui";

const GROUP_ORDER = [
  "Text formatting", "Font", "Color", "Paragraph", "Lists", "Insert", "Tools",
  "AI", "Export & Import", "Collaboration", "Premium",
];
function groupRank(g: string): number {
  const i = GROUP_ORDER.indexOf(g);
  return i === -1 ? GROUP_ORDER.length : i;
}

export default function EditPackageDialog({
  pkg, features, onClose, onSaved,
}: {
  pkg: Package;
  features: Feature[];
  onClose: () => void;
  onSaved: (updated: Package) => void;
}) {
  const [name, setName] = useState(pkg.name);
  const [description, setDescription] = useState(pkg.description || "");
  const [price, setPrice] = useState((pkg.priceCents / 100).toFixed(2));
  const [interval, setInterval] = useState(pkg.billingInterval);
  const [isFree, setIsFree] = useState(pkg.isFree ?? false);
  const [domainBound, setDomainBound] = useState(pkg.domainBound);
  const [picked, setPicked] = useState<Set<string>>(new Set(pkg.features.map((f) => f.id)));
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Close on Escape (standard modal behaviour; the backdrop click also closes).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(id: string) {
    setPicked((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
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

  async function save(e: React.FormEvent) {
    e.preventDefault(); setFormError(null);
    const cents = Math.round(parseFloat(price) * 100);
    if (!name.trim()) return setFormError("Name is required");
    if (!Number.isFinite(cents) || cents < 0) return setFormError("Price must be ≥ 0");
    if (picked.size === 0) return setFormError("Pick at least one feature");
    setSaving(true);
    try {
      const updated = await apiPatch<Package>(`/api/admin/packages/${pkg.id}`, {
        name: name.trim(), description: description.trim(), priceCents: cents, // currency is USD-only (server-enforced)
        billingInterval: interval, isFree, domainBound, featureIds: [...picked],
        // NOTE: `active` and `publiclyListed` are intentionally NOT sent here —
        // they're managed by the quick row-toggles in PackagesPanel, so a slow
        // edit-save can't clobber a visibility change made meanwhile.
        // The server enforces isFree ⇒ price 0 + interval once; the UI mirrors it.
      });
      onSaved(updated);
    } catch (e) { setFormError((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ background: "color-mix(in oklab, black 50%, transparent)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: "var(--paper)", border: "1px solid var(--edge)", boxShadow: "0 12px 40px rgba(0,0,0,.28)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${pkg.name}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--ink)" }}>Edit package</h2>
          <button
            type="button" onClick={onClose} aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded-lg text-lg leading-none transition-colors"
            style={{ color: "var(--ink-muted)", border: "1px solid var(--edge)" }}
          >×</button>
        </div>
        <form onSubmit={save} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>
            Name<input value={name} onChange={(e) => setName(e.target.value)} className="oe-input" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>
            Description <span className="font-normal" style={{ color: "var(--ink-muted)" }}>(shown on the storefront)</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} className="oe-input" />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--ink)" }}>
            <input
              type="checkbox" checked={isFree}
              onChange={(e) => {
                const on = e.target.checked; setIsFree(on);
                if (on) { setPrice("0.00"); setInterval("once"); }
                // Un-checking: clear the coerced 0 so the admin must enter a real
                // price (an empty price fails validation) — avoids silently saving
                // a "paid" package still priced $0 (which would be un-buyable).
                else if (price === "0.00") setPrice("");
              }}
            />
            Free / comp package <span className="font-normal" style={{ color: "var(--ink-muted)" }}>(price 0, one-time — for licenses YOU issue to someone for free; it is NOT sold or shown on your public pricing page)</span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>
            Price (USD)
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--ink-muted)" }}>$</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} className="oe-input" inputMode="decimal" disabled={isFree} />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>
            Billing
            <select value={interval} onChange={(e) => setInterval(e.target.value)} className="oe-input" disabled={isFree}>
              <option value="once">One-time</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="lifetime">Lifetime</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--ink)" }}>
            <input type="checkbox" checked={domainBound} onChange={(e) => setDomainBound(e.target.checked)} />
            Domain-bound <span className="font-normal" style={{ color: "var(--ink-muted)" }}>(license tied to the buyer&apos;s domain)</span>
          </label>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                Features ({picked.size}/{features.length} selected)
              </span>
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="oe-input" placeholder="Search features…" />
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-lg p-2" style={{ border: "1px solid var(--edge)" }}>
              {groupedFeatures.length === 0 && <p className="p-1 text-xs" style={{ color: "var(--ink-muted)" }}>No features match.</p>}
              {groupedFeatures.map(([label, items]) => {
                const pickedCount = items.filter((f) => picked.has(f.id)).length;
                const allOn = pickedCount === items.length;
                const isCollapsed = collapsed.has(label);
                return (
                  <fieldset key={label} className="flex flex-col gap-1 rounded-md p-1.5" style={{ border: "1px solid var(--edge)" }}>
                    <div className="flex items-center gap-2">
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
                            {f.kind === "premium" && <Badge tone="brand">premium</Badge>}
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>
                );
              })}
            </div>
          </div>
          {formError && <p role="alert" className="text-sm" style={{ color: "#c5221f" }}>{formError}</p>}
          <div className="mt-1 flex gap-2">
            <Button type="button" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
