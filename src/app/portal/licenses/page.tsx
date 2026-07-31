"use client";

/**
 * /portal/licenses — the authenticated "my licenses" page (Phase 4b). Lists the
 * customer's licenses with status + expiry, reveals the current key on demand
 * (never shown until asked), and lets them regenerate a compromised key. All
 * data comes from same-origin /api/portal/* routes (httpOnly customer session).
 * A 401 anywhere sends the customer back to sign in.
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface LicenseView {
  id: string; licId: string; planName: string;
  features: string[]; domains: string[];
  issuedAt: number; expiresAt: number;
  effectiveStatus: "active" | "revoked" | "expired";
}

function fmtDate(unixSeconds: number): string {
  try { return new Date(unixSeconds * 1000).toLocaleDateString(); } catch { return "—"; }
}

export default function MyLicensesPage() {
  const router = useRouter();
  const [licenses, setLicenses] = useState<LicenseView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/portal/licenses", { cache: "no-store" });
    if (res.status === 401) { router.replace("/portal"); return; }
    if (!res.ok) { setError("Could not load your licenses."); return; }
    setLicenses(await res.json());
  }, [router]);

  useEffect(() => {
    // Defer to a microtask so the effect body itself performs no synchronous
    // setState (react-hooks/set-state-in-effect); `live` guards a StrictMode
    // double-invoke / unmount. Matches the admin panels' load pattern.
    let live = true;
    void Promise.resolve().then(() => { if (live) void load(); });
    return () => { live = false; };
  }, [load]);

  async function reveal(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/portal/licenses/${id}/key`, { cache: "no-store" });
      if (res.status === 401) { router.replace("/portal"); return; }
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Could not reveal the key.");
      setRevealed((prev) => ({ ...prev, [id]: b.token }));
    } catch (e) { setError((e as Error).message); }
    finally { setBusyId(null); }
  }

  async function regenerate(id: string) {
    if (!confirm("Regenerate this key? The current key will stop working immediately.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/portal/licenses/${id}/regenerate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
      if (res.status === 401) { router.replace("/portal"); return; }
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Could not regenerate the key.");
      // Show the brand-new key and refresh the list (old one now revoked).
      setRevealed((prev) => ({ ...prev, [b.view.id]: b.token }));
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusyId(null); }
  }

  async function copy(id: string, token: string) {
    try { await navigator.clipboard.writeText(token); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500); }
    catch { /* clipboard unavailable — the key is visible to select manually */ }
  }

  async function signOut() {
    await fetch("/api/portal/logout", { method: "POST", headers: { "Content-Type": "application/json" } }).catch(() => undefined);
    router.replace("/portal");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--ink)" }}>Your licenses</h1>
        <button type="button" onClick={signOut} className="text-sm hover:underline" style={{ color: "var(--ink-muted)" }}>Sign out</button>
      </div>

      {error && <p role="alert" className="mb-3 text-sm" style={{ color: "#b3261e" }}>{error}</p>}
      {licenses === null && !error && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading…</p>}
      {licenses !== null && licenses.length === 0 && (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>No licenses on this account yet.</p>
      )}

      <ul className="flex flex-col gap-3">
        {(licenses || []).map((l) => (
          <li key={l.id} className="rounded-xl p-4" style={{ background: "var(--paper-raised)", border: "1px solid var(--edge)" }}>
            <div className="flex items-center justify-between">
              <span className="font-medium" style={{ color: "var(--ink)" }}>{l.planName}</span>
              <span
                className="rounded-full px-2 py-0.5 text-xs"
                style={{
                  background: "color-mix(in oklab, var(--brand) 12%, var(--paper))",
                  color: l.effectiveStatus === "active" ? "var(--brand)" : "#b3261e",
                }}
              >{l.effectiveStatus}</span>
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
              {l.features.length} feature{l.features.length === 1 ? "" : "s"}
              {l.domains.length ? ` · ${l.domains.join(", ")}` : ""}
              {" · expires "}{fmtDate(l.expiresAt)}
            </p>

            {revealed[l.id] ? (
              <div className="mt-3">
                <pre
                  className="overflow-x-auto rounded-lg p-3 text-xs"
                  style={{ background: "var(--paper)", border: "1px solid var(--edge)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}
                >{revealed[l.id]}</pre>
                <button type="button" onClick={() => copy(l.id, revealed[l.id])} className="mt-2 text-xs hover:underline" style={{ color: "var(--brand)" }}>
                  {copiedId === l.id ? "Copied!" : "Copy key"}
                </button>
              </div>
            ) : (
              <div className="mt-3 flex gap-3">
                {l.effectiveStatus === "active" && (
                  <button type="button" disabled={busyId === l.id} onClick={() => reveal(l.id)} className="text-sm hover:underline disabled:opacity-60" style={{ color: "var(--brand)" }}>
                    {busyId === l.id ? "…" : "Reveal key"}
                  </button>
                )}
                <button type="button" disabled={busyId === l.id} onClick={() => regenerate(l.id)} className="text-sm hover:underline disabled:opacity-60" style={{ color: "var(--ink-muted)" }}>
                  Regenerate
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
