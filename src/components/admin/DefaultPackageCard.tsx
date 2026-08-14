"use client";

/**
 * DefaultPackageCard — which package UNLICENSED visitors receive.
 *
 * ─── WHY THIS IS ITS OWN CARD, NOT A ROW ACTION ─────────────────────────────
 * Every other package setting affects people who BOUGHT something. This one
 * affects everyone who did not — every anonymous editor on the internet loading
 * from this backend. Burying it in a row menu would make the single most
 * consequential switch in the panel look like the least.
 *
 * It also answers a question the packages table cannot: "what do free users
 * get right now?" That used to be unanswerable from the UI at all, because the
 * free tier was decided by how the engine bundle was COMPILED.
 *
 * ─── THE CONFIRM STEP IS DELIBERATE ─────────────────────────────────────────
 * Changing this takes effect immediately for every unlicensed visitor, with no
 * deploy and no staging. That is the feature — and it is exactly why it should
 * not be a single click on a dropdown.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, type Package } from "./types";
import { Card, Badge, Button } from "./ui";

interface Designation {
  packageId: string;
  name: string | null;
}

export default function DefaultPackageCard({
  packages,
  onChanged,
}: {
  packages: Package[];
  /** Let the parent refresh its own list — the guard rules depend on it. */
  onChanged?: () => void;
}) {
  const [current, setCurrent] = useState<Designation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string>("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      // A null body is valid: nothing designated yet (a fresh install before
      // the backend seed has run). Rendered as a warning, not an error.
      const res = await apiGet<Designation | null>("/api/admin/packages/default");
      setCurrent(res && res.packageId ? res : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the default package");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * `cancelled` rather than calling `load()` directly, so setState never runs
   * against an unmounted component — and so react-hooks/set-state-in-effect is
   * satisfied honestly rather than suppressed. The rule is right: a synchronous
   * setState inside an effect causes a cascading render, and an async one after
   * unmount is a leak.
   */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiGet<Designation | null>("/api/admin/packages/default");
        if (cancelled) return;
        setCurrent(res && res.packageId ? res : null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load the default package");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const currentPkg = packages.find((p) => p.id === current?.packageId) || null;
  const pickedPkg = packages.find((p) => p.id === picked) || null;

  async function apply() {
    if (!picked) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/admin/packages/default", {
        packageId: picked,
        reason: "changed from the admin panel",
      });
      setConfirming(false);
      setPicked("");
      await load();
      onChanged?.();
    } catch (e) {
      // The backend refuses a package granting no features; surface its own
      // wording rather than inventing a vaguer one.
      setError(e instanceof Error ? e.message : "Could not change the default package");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-6" style={{ borderColor: "var(--edge)", borderWidth: 1, borderStyle: "solid" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
            Free tier — what visitors get without a licence
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Applies to everyone using the editor with no licence key, and to anyone whose
            licence is expired, revoked or blocked. Changes take effect immediately.
          </p>
        </div>
        {loading ? null : current ? (
          <Badge tone="good">Active</Badge>
        ) : (
          <Badge tone="warn">Not set</Badge>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm" style={{ color: "var(--ink-muted)" }}>Loading…</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span style={{ color: "var(--ink-muted)" }}>Currently serving:</span>
            {current ? (
              <>
                <strong style={{ color: "var(--ink)" }}>{currentPkg?.name || current.name || current.packageId}</strong>
                {currentPkg && (
                  <Badge tone="neutral">{currentPkg.features.length} features</Badge>
                )}
              </>
            ) : (
              <strong style={{ color: "#b26a00" }}>
                nothing designated — visitors are getting a minimal fallback
              </strong>
            )}
          </div>

          {!confirming ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <select
                value={picked}
                onChange={(e) => setPicked(e.target.value)}
                className="oe-input"
                style={{ maxWidth: 320 }}
                aria-label="Choose the package for unlicensed visitors"
              >
                <option value="">Change to…</option>
                {packages
                  // A package granting nothing would leave every visitor with an
                  // editor that does nothing; the backend refuses it, so do not
                  // offer it here either.
                  .filter((p) => p.features.length > 0 && p.id !== current?.packageId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.features.length} features)
                    </option>
                  ))}
              </select>
              <Button
                variant="primary"
                size="sm"
                disabled={!picked}
                onClick={() => setConfirming(true)}
              >
                Review change
              </Button>
            </div>
          ) : (
            <div
              className="mt-4 rounded-lg p-4"
              style={{ background: "color-mix(in oklab, #b26a00 8%, transparent)" }}
            >
              <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                Change the free tier to <strong>{pickedPkg?.name}</strong>?
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
                Every unlicensed visitor will get {pickedPkg?.features.length} features
                {currentPkg ? ` instead of ${currentPkg.features.length}` : ""}. This applies
                immediately, to everyone, with no deploy.
              </p>
              {/* A REDUCTION is the dangerous direction, and the sentence above
                  states it as a neutral fact ("7 instead of 53") that is easy to
                  skim past. Losing features is what an existing free user will
                  actually notice — and since the engine now honours the package
                  exactly, those toolbar buttons DISAPPEAR rather than merely
                  refusing to act. Say so, and name what goes. */}
              {currentPkg && pickedPkg && pickedPkg.features.length < currentPkg.features.length && (
                <div
                  className="mt-3 rounded-md px-3 py-2 text-sm"
                  style={{ background: "color-mix(in oklab, #b3261e 10%, transparent)", color: "var(--ink)" }}
                >
                  <strong>
                    This REMOVES {currentPkg.features.length - pickedPkg.features.length} feature
                    {currentPkg.features.length - pickedPkg.features.length === 1 ? "" : "s"} from
                    every existing free user.
                  </strong>{" "}
                  Their toolbar buttons disappear on next page load — they are not
                  merely disabled.
                  {(() => {
                    const keep = new Set(pickedPkg.features.map((f) => f.id));
                    const lost = currentPkg.features.filter((f) => !keep.has(f.id));
                    return lost.length ? (
                      <span>
                        {" "}Losing: {lost.slice(0, 6).map((f) => f.title || f.id).join(", ")}
                        {lost.length > 6 ? ` and ${lost.length - 6} more` : ""}.
                      </span>
                    ) : null;
                  })()}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <Button variant="primary" size="sm" disabled={saving} onClick={apply}>
                  {saving ? "Applying…" : "Yes, change it"}
                </Button>
                <Button size="sm" disabled={saving} onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {currentPkg && currentPkg.features.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm" style={{ color: "var(--ink-muted)" }}>
                Show the {currentPkg.features.length} features free users get
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {currentPkg.features.map((f) => (
                  <Badge key={f.id} tone="neutral">{f.title || f.id}</Badge>
                ))}
              </div>
            </details>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm" style={{ color: "#b3261e" }}>{error}</p>
          )}
        </>
      )}
    </Card>
  );
}
