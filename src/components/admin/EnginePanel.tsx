"use client";

/**
 * EnginePanel — which BUILD customers receive, and how it moves.
 *
 * ─── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * The engine has release channels (internal → beta → stable), a default
 * pointer, per-licence pins and overrides, and a one-call rollback. All of it
 * was reachable only by curl. A rollback you can only perform from a terminal
 * is a rollback you will not perform at 3am, and version staging nobody can see
 * is version staging nobody uses.
 *
 * ─── THE ONE THING THAT MUST NOT CHANGE ─────────────────────────────────────
 * Rollback takes NO version argument. The backend reads the target from
 * recorded history precisely so it cannot be mistyped under pressure
 * (RUNBOOK §1). Putting a UI in front of it must not reintroduce a version
 * field — so this shows the target it WILL use and asks you to confirm, rather
 * than asking you to name one.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch } from "./types";
import { PageHeader, Card, Badge, Button, Table, Th, Td, EmptyRow, useToasts, confirmAction } from "./ui";

interface Version {
  version: string;
  plan: string;
  channel: "internal" | "beta" | "stable";
  supportedFeatures?: string[];
  retiredAt?: number;
}

interface Designation { scope: string; version: string; updatedAt?: string }

interface HistoryRow {
  id: string;
  scope: string;
  fromVersion: string;
  toVersion: string;
  kind: string;
  actor: string;
  reason: string;
  createdAt: string;
}

const CHANNEL_TONE = { stable: "good", beta: "warn", internal: "neutral" } as const;

/** Sort newest-version-first so the build people care about is at the top. */
function byVersionDesc(a: string, b: string) {
  return b.localeCompare(a, undefined, { numeric: true });
}

export default function EnginePanel() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [defaults, setDefaults] = useState<Designation[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const { notify, ToastHost } = useToasts();

  const reload = useCallback(async () => {
    try {
      const [v, d, h] = await Promise.all([
        apiGet<Version[]>("/api/admin/engine/versions"),
        apiGet<Designation[]>("/api/admin/engine/defaults"),
        apiGet<HistoryRow[]>("/api/admin/engine/defaults/history?scope=global"),
      ]);
      setVersions(Array.isArray(v) ? v : []);
      setDefaults(Array.isArray(d) ? d : []);
      setHistory(Array.isArray(h) ? h : []);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Deferred off the synchronous effect path, matching the other panels: a
  // setState inside the effect body triggers a cascading render, and the lint
  // rule that catches it is correct.
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void reload(); });
    return () => { active = false; };
  }, [reload]);

  const globalDefault = defaults.find((d) => d.scope === "global")?.version ?? "";

  // One row per VERSION, not per (version, plan): a version is published as two
  // rows (free + premium) and is promoted as a unit, so showing both would imply
  // they can diverge.
  const grouped = Array.from(new Set(versions.map((v) => v.version)))
    .sort(byVersionDesc)
    .map((version) => {
      const rows = versions.filter((v) => v.version === version);
      return {
        version,
        channel: rows[0]?.channel ?? "internal",
        plans: rows.map((r) => r.plan).sort(),
        features: Math.max(...rows.map((r) => r.supportedFeatures?.length ?? 0)),
        isDefault: version === globalDefault,
      };
    });

  async function promote(version: string, channel: string) {
    if (!confirmAction(
      `Promote engine ${version} to "${channel}"?\n\n`
      + (channel === "stable"
        ? "STABLE means every customer on the stable channel can receive it once it is also the default."
        : `Only licences opted in to "${channel}" will receive it.`),
    )) return;
    setBusy(version);
    try {
      await apiPatch(`/api/admin/engine/versions/${encodeURIComponent(version)}/channel`, { channel });
      notify("success", `${version} promoted to ${channel}`);
      await reload();
    } catch (e) {
      notify("error", (e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function makeDefault(version: string) {
    if (!confirmAction(
      `Point the GLOBAL default at engine ${version}?\n\n`
      + `Every visitor and every customer without a pin or override moves from `
      + `${globalDefault || "(none)"} to ${version} on their next page load.`,
    )) return;
    const reason = window.prompt("Why? (recorded in the audit history)") ?? "";
    setBusy(version);
    try {
      await apiPost("/api/admin/engine/defaults", { scope: "global", version, reason });
      notify("success", `global default → ${version}`);
      await reload();
    } catch (e) {
      notify("error", (e as Error).message);
    } finally {
      setBusy("");
    }
  }

  /**
   * The target is READ from history, never typed — and this preview must derive
   * it EXACTLY as the backend does, or the confirmation lies about what is
   * about to happen.
   *
   * The backend takes `fromVersion` of the MOST RECENT history row for the
   * scope (engine-version.service.previousDefault). A first attempt here
   * searched for the row whose `toVersion` matched the current default, which
   * silently picks an OLDER entry whenever newer rows exist: with a rollback
   * already in history it previewed "1.2.2 → 7.7.7", i.e. rolling FORWARD into
   * the broken build. A confirmation that names the wrong target is worse than
   * none, because it is trusted.
   *
   * History arrives newest-first, so the first matching row is the right one.
   */
  const rollbackTarget = history.find((h) => h.scope === "global")?.fromVersion || "";

  async function rollback() {
    if (!confirmAction(
      `ROLL BACK the global default?\n\n`
      + `${globalDefault || "(none)"}  →  ${rollbackTarget || "the previous recorded version"}\n\n`
      + "Every new session gets the previous build within seconds. Editors already "
      + "open keep running the current one until their page reloads.",
    )) return;
    const reason = window.prompt("Why are you rolling back? (recorded in the audit history)") ?? "";
    if (!reason.trim()) { notify("error", "a reason is required — it is the only record of why"); return; }
    setBusy("rollback");
    try {
      const r = await apiPost<{ from?: string; to?: string }>("/api/admin/engine/rollback", { reason });
      notify("success", `rolled back ${r?.from ?? "?"} → ${r?.to ?? "?"}`);
      await reload();
    } catch (e) {
      notify("error", (e as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Engine"
        subtitle="Which build customers receive, and how it moves between channels."
        action={
          <Button
            variant="ghost"
            size="sm"
            disabled={!globalDefault || busy !== "" || !history.length}
            onClick={() => void rollback()}
          >
            {busy === "rollback" ? "Rolling back…" : "Roll back"}
          </Button>
        }
      />

      {error && <p role="alert" style={{ color: "#b3261e" }}>{error}</p>}
      {loading && <p style={{ color: "var(--ink-muted)" }}>Loading…</p>}

      {!loading && (
        <Card>
          <div className="mb-3 flex flex-wrap items-baseline gap-2">
            <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              Published builds
            </h3>
            <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
              serving <strong>{globalDefault || "nothing"}</strong> to everyone without a pin or override
            </span>
          </div>
          <Table head={<>
            <Th>Version</Th><Th>Channel</Th><Th>Plans</Th><Th align="right">Features</Th><Th align="right">Actions</Th>
          </>}>
            {grouped.length === 0 ? (
              <EmptyRow cols={5}>No engine builds published yet.</EmptyRow>
            ) : grouped.map((g) => (
              <tr key={g.version}>
                <Td>
                  <span className="font-mono">{g.version}</span>{" "}
                  {g.isDefault && <Badge tone="brand">default</Badge>}
                </Td>
                <Td><Badge tone={CHANNEL_TONE[g.channel] ?? "neutral"}>{g.channel}</Badge></Td>
                <Td><span className="text-xs" style={{ color: "var(--ink-muted)" }}>{g.plans.join(" + ")}</span></Td>
                <Td align="right">{Number.isFinite(g.features) ? g.features : "—"}</Td>
                <Td align="right">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {g.channel !== "beta" && g.channel !== "stable" && (
                      <Button size="sm" disabled={busy !== ""} onClick={() => void promote(g.version, "beta")}>
                        → beta
                      </Button>
                    )}
                    {g.channel !== "stable" && (
                      <Button size="sm" disabled={busy !== ""} onClick={() => void promote(g.version, "stable")}>
                        → stable
                      </Button>
                    )}
                    {!g.isDefault && (
                      <Button variant="primary" size="sm" disabled={busy !== ""} onClick={() => void makeDefault(g.version)}>
                        Make default
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {!loading && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Release history
          </h3>
          <Table head={<><Th>Change</Th><Th>Kind</Th><Th>Reason</Th><Th align="right">When</Th></>}>
            {history.length === 0 ? (
              <EmptyRow cols={4}>Nothing recorded yet.</EmptyRow>
            ) : history.slice(0, 12).map((h) => (
              <tr key={h.id}>
                <Td>
                  <span className="font-mono text-xs">
                    {h.fromVersion || "—"} → {h.toVersion}
                  </span>
                </Td>
                <Td><Badge tone={h.kind === "rollback" ? "warn" : "neutral"}>{h.kind}</Badge></Td>
                <Td>
                  <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {h.reason || <em>no reason recorded</em>}
                  </span>
                </Td>
                <Td align="right">
                  <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {new Date(h.createdAt).toLocaleString()}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <ToastHost />
    </div>
  );
}
