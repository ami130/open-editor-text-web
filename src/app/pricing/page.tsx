"use client";

/**
 * /pricing — the PUBLIC self-serve storefront. Lists the packages an admin has
 * marked publiclyListed, and lets anyone buy one: pick a plan → enter email
 * (+ domain if the plan is domain-bound) → continue to the EMBEDDED /checkout
 * page (Stripe payment form rendered ON THIS SITE, no redirect). No login, no
 * tokens. The backend owns the price; this page never sends an amount.
 */
import { useCallback, useEffect, useState } from "react";

interface PublicPackage {
  id: string; name: string; description: string; priceCents: number; currency: string;
  billingInterval: string; domainBound: boolean; features: { id: string; title: string }[];
}

function money(cents: number, currency: string): string {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100); }
  catch { return `${(cents / 100).toFixed(2)} ${currency}`; }
}

export default function PricingPage() {
  const [packages, setPackages] = useState<PublicPackage[]>([]);
  const [billingEnabled, setBillingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicPackage | null>(null);

  const load = useCallback(async () => {
    try {
      const [pkgRes, statusRes] = await Promise.all([
        fetch("/api/public/packages", { cache: "no-store" }),
        fetch("/api/public/billing-status", { cache: "no-store" }),
      ]);
      const pkgs = await pkgRes.json();
      const status = await statusRes.json().catch(() => ({ enabled: true }));
      setError(null);
      setPackages(Array.isArray(pkgs) ? pkgs : []);
      setBillingEnabled(!!status.enabled);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>Pricing</h1>
        <p className="mt-2" style={{ color: "var(--ink-muted)" }}>Choose a plan and get your license instantly.</p>
      </header>

      {!billingEnabled && (
        <p className="mb-6 rounded-lg px-4 py-3 text-center text-sm" style={{ background: "color-mix(in oklab, #8a6d00 12%, var(--paper))", color: "#8a6d00" }}>
          Online checkout is being set up — please check back soon.
        </p>
      )}
      {loading && <p style={{ color: "var(--ink-muted)" }}>Loading plans…</p>}
      {error && <p role="alert" style={{ color: "#b3261e" }}>{error}</p>}
      {!loading && !error && packages.length === 0 && (
        <p style={{ color: "var(--ink-muted)" }}>No plans are available right now.</p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((p) => (
          <div key={p.id} className="card flex flex-col rounded-2xl p-6" style={{ background: "var(--paper-raised)", border: "1px solid var(--edge)" }}>
            <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{p.name}</h2>
            {p.description && <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>{p.description}</p>}
            <div className="mt-4 text-3xl font-bold" style={{ color: "var(--ink)" }}>
              {money(p.priceCents, p.currency)}
              <span className="ml-1 text-sm font-normal" style={{ color: "var(--ink-muted)" }}>
                {/* Billing is a ONE-TIME charge for a fixed ACCESS WINDOW — NOT a
                    recurring subscription (audit B2). "monthly"/"yearly" therefore
                    read as "30-day / 1-year access", never "/ month" (which implies
                    an auto-charge that never happens and would drive chargebacks). */}
                {p.billingInterval === "once"
                  ? "one-time"
                  : p.billingInterval === "lifetime"
                    ? "lifetime"
                    : p.billingInterval === "monthly"
                      ? "· 30-day access"
                      : p.billingInterval === "yearly"
                        ? "· 1-year access"
                        : `· ${p.billingInterval} access`}
              </span>
            </div>
            {/* Make the one-time-for-a-window model explicit on finite plans (audit
                B2) so a buyer never expects an auto-renewal that won't happen. */}
            {(p.billingInterval === "monthly" || p.billingInterval === "yearly") && (
              <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
                One-time payment for {p.billingInterval === "monthly" ? "30 days" : "1 year"} of access · no auto-renewal · re-purchase anytime
              </p>
            )}
            <ul className="mt-4 flex flex-1 flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>
              {p.features.map((f) => (
                <li key={f.id} className="flex items-center gap-2">
                  <span aria-hidden style={{ color: "var(--brand)" }}>✓</span> {f.title}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setSelected(p)} disabled={!billingEnabled}
              className="btn-primary mt-6 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {billingEnabled ? "Buy now" : "Coming soon"}
            </button>
          </div>
        ))}
      </div>

      {selected && <CheckoutDialog pkg={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CheckoutDialog({ pkg, onClose }: { pkg: PublicPackage; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [domains, setDomains] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!email.trim()) return setError("Email is required");
    const domainList = domains.split(",").map((d) => d.trim()).filter(Boolean);
    if (pkg.domainBound && domainList.length === 0) return setError("Enter the domain your license will be used on");
    // Hand the selection to the EMBEDDED /checkout page via sessionStorage
    // (never a clientSecret in the URL). /checkout creates the Stripe session
    // and renders the payment form ON THIS SITE — no redirect to Stripe.
    setBusy(true);
    try {
      sessionStorage.setItem("oe:checkout:selection", JSON.stringify({
        packageId: pkg.id, packageName: pkg.name,
        email: email.trim(), name: name.trim(), domains: domainList,
      }));
      window.location.href = "/checkout";
    } catch { setError("Could not start checkout."); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "color-mix(in oklab, black 45%, transparent)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "var(--paper-raised)", border: "1px solid var(--edge)" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>Buy {pkg.name}</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>{money(pkg.priceCents, pkg.currency)} — secure card payment on the next step.</p>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="oe-input" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>Name <span className="font-normal" style={{ color: "var(--ink-muted)" }}>(optional)</span><input value={name} onChange={(e) => setName(e.target.value)} className="oe-input" /></label>
          {pkg.domainBound && (
            <label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--ink)" }}>
              Domain(s) <span className="font-normal" style={{ color: "var(--ink-muted)" }}>(comma-separated)</span>
              <input value={domains} onChange={(e) => setDomains(e.target.value)} className="oe-input" placeholder="mysite.com" />
            </label>
          )}
          {error && <p role="alert" className="text-sm" style={{ color: "#b3261e" }}>{error}</p>}
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg px-4 py-2 text-sm font-medium" style={{ border: "1px solid var(--edge)", color: "var(--ink)" }}>Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">{busy ? "Continuing…" : "Continue to payment"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
