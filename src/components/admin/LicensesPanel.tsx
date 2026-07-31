"use client";

/** Licenses: search/filter, list (effective status, expiry, no token) +
 *  issue (customer × package, shows the signed key ONCE to copy) + revoke +
 *  regenerate + renew + rebind + resend-email + dismiss-flag. Presentation uses
 *  the shared admin UI kit; all data/actions logic is unchanged. */
import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPost, type Customer, type License, type Package } from "./types";
import { ErrorBox } from "./PackagesPanel";
import { CopyButton, PageHeader, Card, Badge, Button, useToasts } from "./ui";

const STATUS_OPTIONS = ["", "active", "expired", "revoked"] as const;

function formatDate(unixSeconds: number): string {
  try { return new Date(unixSeconds * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return "—"; }
}

export default function LicensesPanel() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [regeneratedToken, setRegeneratedToken] = useState<{ licenseId: string; token: string } | null>(null);
  const { notify, ToastHost } = useToasts();

  const load = useCallback(async (q: string, st: string) => {
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      if (st) qs.set("status", st);
      const licPath = qs.size ? `/api/admin/licenses?${qs.toString()}` : "/api/admin/licenses";
      const [lics, custs, pkgs] = await Promise.all([
        apiGet<License[]>(licPath),
        apiGet<Customer[]>("/api/admin/customers"),
        apiGet<Package[]>("/api/admin/packages"),
      ]);
      setError(null); setLicenses(lics); setCustomers(custs); setPackages(pkgs);
      if (custs[0]) setCustomerId((cur) => cur || custs[0].id);
      if (pkgs[0]) setPackageId((cur) => cur || pkgs[0].id);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void load("", ""); });
    return () => { active = false; if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [load]);
  function reload() { setLoading(true); void load(search, status); }

  function onSearchChange(value: string) {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => { setLoading(true); void load(value, status); }, 300);
  }
  function onStatusChange(value: string) {
    setStatus(value);
    setLoading(true); void load(search, value);
  }

  async function issue(e: React.FormEvent) {
    e.preventDefault(); setFormError(null); setIssuedToken(null);
    if (!customerId || !packageId) return setFormError("Pick a customer and a package");
    setIssuing(true);
    try {
      const lic = await apiPost<License>("/api/admin/licenses", { customerId, packageId });
      setIssuedToken(lic.token || null);
      notify("success", "License issued — copy the key below (shown once).");
      await load(search, status);
    } catch (e) { setFormError((e as Error).message); }
    finally { setIssuing(false); }
  }

  function setRowErr(id: string, message: string | null) {
    setRowError((prev) => { const n = { ...prev }; if (message) n[id] = message; else delete n[id]; return n; });
  }

  async function revoke(l: License) {
    // Revoke permanently kills a working license — confirm, like regenerate/rebind
    // do (this is the most destructive single action an admin can take).
    const who = l.customer?.name || l.customer?.email || "this customer";
    if (!window.confirm(`Revoke the license for ${who}? It stops working and CANNOT be un-revoked — the customer would need a brand-new license. Continue?`)) return;
    setBusyId(l.id); setRowErr(l.id, null);
    try { await apiPost(`/api/admin/licenses/${l.id}/revoke`); notify("success", "License revoked."); await load(search, status); }
    catch (e) { const msg = (e as Error).message; setRowErr(l.id, msg); notify("error", `Revoke failed: ${msg}`); }
    finally { setBusyId(null); }
  }

  async function dismissFlag(id: string) {
    setBusyId(id); setRowErr(id, null);
    try { await apiPost(`/api/admin/licenses/${id}/dismiss-flag`); notify("success", "Sharing flag dismissed."); await load(search, status); }
    catch (e) { const msg = (e as Error).message; setRowErr(id, msg); notify("error", `Dismiss failed: ${msg}`); }
    finally { setBusyId(null); }
  }

  async function rebind(l: License) {
    const input = window.prompt(
      `Rebind this license to NEW domain(s) (comma-separated). The OLD key stops working; the customer is emailed the new key to re-paste. Current: ${l.domains.join(", ") || "(none)"}`,
      l.domains.join(", "),
    );
    if (input === null) return; // cancelled
    const domains = input.split(",").map((d) => d.trim()).filter(Boolean);
    if (domains.length === 0) { notify("error", "Enter at least one domain."); return; }
    setBusyId(l.id); setRowErr(l.id, null); setRegeneratedToken(null);
    try {
      const res = await apiPost<{ licenseId: string; delivered: boolean; licenseKey?: string }>(
        `/api/admin/licenses/${l.id}/rebind-domains`, { domains });
      if (res.delivered) {
        notify("success", `Rebound to ${domains.join(", ")} — the customer was emailed the new key.`);
      } else {
        if (res.licenseKey) setRegeneratedToken({ licenseId: res.licenseId, token: res.licenseKey });
        notify("error", "Rebound, but the email could NOT be delivered — copy the new key below and send it to the customer.");
      }
      await load(search, status);
    } catch (e) { const msg = (e as Error).message; setRowErr(l.id, msg); notify("error", `Rebind failed: ${msg}`); }
    finally { setBusyId(null); }
  }

  async function regenerate(l: License) {
    if (!window.confirm(`Regenerate the license for ${l.customer?.name || l.customer?.email}? The OLD license (#${l.id}) will be revoked immediately and can never be used again.`)) return;
    setBusyId(l.id); setRowErr(l.id, null); setRegeneratedToken(null);
    try {
      const fresh = await apiPost<License>(`/api/admin/licenses/${l.id}/regenerate`);
      setRegeneratedToken({ licenseId: fresh.id, token: fresh.token || "" });
      notify("success", `New license issued for ${l.customer?.email || "customer"} — copy the new key + send it to them.`);
      await load(search, status);
    } catch (e) { const msg = (e as Error).message; setRowErr(l.id, msg); notify("error", `Regenerate failed: ${msg}`); }
    finally { setBusyId(null); }
  }

  async function renew(l: License) {
    setBusyId(l.id); setRowErr(l.id, null); setRegeneratedToken(null);
    try {
      const fresh = await apiPost<License>(`/api/admin/licenses/${l.id}/renew`);
      setRegeneratedToken({ licenseId: fresh.id, token: fresh.token || "" });
      notify("success", `License renewed — new expiry ${formatDate(fresh.expiresAt)}. Copy the refreshed key below.`);
      await load(search, status);
    } catch (e) { const msg = (e as Error).message; setRowErr(l.id, msg); notify("error", `Renew failed: ${msg}`); }
    finally { setBusyId(null); }
  }

  async function resendEmail(l: License) {
    setBusyId(l.id); setRowErr(l.id, null);
    try {
      const r = await apiPost<{ delivered: boolean; to: string }>(`/api/admin/licenses/${l.id}/resend-email`);
      if (r.delivered) notify("success", `License email re-sent to ${r.to}.`);
      else notify("error", `Email transport failed for ${r.to} — check SMTP/webhook config, then retry.`);
      await load(search, status);
    } catch (e) { const msg = (e as Error).message; setRowErr(l.id, msg); notify("error", `Resend failed: ${msg}`); }
    finally { setBusyId(null); }
  }

  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const statusTone = (s: string) => (s === "active" ? "good" : s === "expired" ? "warn" : "bad");

  const KeyReveal = ({ token }: { token: string }) => (
    <Card className="mt-1" style={{ background: "color-mix(in oklab, var(--brand) 6%, var(--paper))" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium" style={{ color: "var(--ink)" }}>License key (copy now — shown once):</p>
        <CopyButton value={token} label="Copy key" />
      </div>
      <textarea readOnly value={token} rows={4} className="oe-input mt-1.5 font-mono text-[11px]" onFocus={(e) => e.currentTarget.select()} />
    </Card>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section>
        <PageHeader title="Licenses" subtitle={`${licenses.length} license${licenses.length === 1 ? "" : "s"}`} />
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="oe-input flex-1"
            style={{ minWidth: "12rem" }}
            placeholder="Search by customer, email, or plan…"
          />
          <select value={status} onChange={(e) => onStatusChange(e.target.value)} className="oe-input" style={{ width: "auto" }}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : "All statuses"}</option>
            ))}
          </select>
        </div>

        {regeneratedToken && <div className="mb-4"><KeyReveal token={regeneratedToken.token} /></div>}

        {loading ? (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading…</p>
        ) : licenses.length === 0 ? (
          <Card><p className="text-center text-sm" style={{ color: "var(--ink-muted)" }}>{search || status ? "No licenses match." : "No licenses issued yet."}</p></Card>
        ) : (
          <div className="flex flex-col gap-3">
            {licenses.map((l) => (
              <Card key={l.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium" style={{ color: "var(--ink)" }}>{l.customer?.name || l.customer?.email || "—"}</span>
                      <span className="text-sm" style={{ color: "var(--ink-muted)" }}>· {l.planName}</span>
                      <Badge tone={statusTone(l.effectiveStatus)}>{l.effectiveStatus}</Badge>
                      {l.flaggedAt ? <Badge tone="bad">⚠ possible sharing</Badge> : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {l.features.map((f) => (
                        <span key={f} className="rounded-full px-1.5 py-0.5 text-[11px]" style={{ background: "var(--paper-raised)", border: "1px solid var(--edge)", color: "var(--ink-muted)" }}>{f}</span>
                      ))}
                    </div>
                    {l.domains.length > 0 && <div className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>{l.domains.join(", ")}</div>}
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>
                      <span>#{l.id.slice(0, 8)}… · issued {formatDate(l.issuedAt)} · expires {formatDate(l.expiresAt)}</span>
                      <CopyButton value={l.id} label="Copy #" className="py-0!" />
                    </div>
                  </div>
                </div>

                {l.effectiveStatus !== "revoked" && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: "var(--edge)" }}>
                    {l.effectiveStatus === "active" && (
                      <Button size="sm" disabled={busyId === l.id} onClick={() => resendEmail(l)} title="Re-send the license key to the customer by email">
                        {busyId === l.id ? "…" : "Resend email"}
                      </Button>
                    )}
                    <Button size="sm" disabled={busyId === l.id} onClick={() => renew(l)} title="Re-mint a fresh token with a new expiry on this same license">
                      {busyId === l.id ? "…" : "Renew"}
                    </Button>
                    <Button size="sm" disabled={busyId === l.id} onClick={() => rebind(l)} title="Change this license's domains → new key, emailed to the customer">
                      {busyId === l.id ? "…" : "Rebind domains"}
                    </Button>
                    <Button size="sm" style={{ color: "var(--brand)" }} disabled={busyId === l.id} onClick={() => regenerate(l)}>
                      {busyId === l.id ? "…" : "Regenerate"}
                    </Button>
                    <Button size="sm" variant="danger" disabled={busyId === l.id} onClick={() => revoke(l)}>
                      {busyId === l.id ? "…" : "Revoke"}
                    </Button>
                    {l.flaggedAt ? (
                      <Button size="sm" disabled={busyId === l.id} onClick={() => dismissFlag(l.id)} title="Dismiss the possible-sharing flag (reviewed, legitimate)">
                        {busyId === l.id ? "…" : "Dismiss flag"}
                      </Button>
                    ) : null}
                  </div>
                )}
                {rowError[l.id] && <p role="alert" className="mt-2 text-xs" style={{ color: "#c5221f" }}>{rowError[l.id]}</p>}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>Issue a license</h3>
        <Card>
          <form onSubmit={issue} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>Customer
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="oe-input">
                {customers.length === 0 && <option value="">— create a customer first —</option>}
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>Package
              <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className="oe-input">
                {packages.length === 0 && <option value="">— create a package first —</option>}
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            {formError && <p role="alert" className="text-sm" style={{ color: "#c5221f" }}>{formError}</p>}
            <Button type="submit" variant="primary" disabled={issuing || !customerId || !packageId}>
              {issuing ? "Issuing…" : "Issue license"}
            </Button>
            {issuedToken && <KeyReveal token={issuedToken} />}
          </form>
        </Card>
      </section>
      <ToastHost />
    </div>
  );
}
