"use client";

/** Orders: searchable/filterable table of self-serve purchases. Surfaces
 *  fulfilled AND failed orders so a "paid but not issued" case is visible and
 *  actionable, plus stuck-pending orders (the webhook likely never arrived) —
 *  which an admin can recover in place with "Force-fulfill" (retrieves the
 *  Stripe session, confirms paid, mints + emails). No license tokens shown. */
import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPost, money, type Order } from "./types";
import { ErrorBox } from "./PackagesPanel";
import { PageHeader, Table, Th, Td, EmptyRow, Badge, Button, useToasts, confirmAction } from "./ui";

const STATUS_OPTIONS = ["", "pending", "fulfilled", "failed", "expired"] as const;

export default function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { notify, ToastHost } = useToasts();

  const load = useCallback(async (q: string, st: string) => {
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      if (st) qs.set("status", st);
      const path = qs.size ? `/api/admin/orders?${qs.toString()}` : "/api/admin/orders";
      const list = await apiGet<Order[]>(path);
      setError(null); setOrders(list);
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

  async function forceFulfill(o: Order) {
    if (!confirmAction(`Force-fulfill this order for ${o.customerEmail}? It retrieves the Stripe session, and only mints if Stripe confirms it was PAID.`)) return;
    setBusyId(o.id);
    try {
      await apiPost(`/api/admin/orders/${o.id}/force-fulfill`);
      notify("success", "Order fulfilled — license minted and emailed.");
      void load(search, status);
    } catch (e) {
      notify("error", (e as Error).message);
    } finally { setBusyId(null); }
  }

  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const failed = orders.filter((o) => o.status === "failed").length;
  const stale = orders.filter((o) => o.stalePending).length;
  const subtitleParts = [`${orders.length} order${orders.length === 1 ? "" : "s"}`];
  if (failed > 0) subtitleParts.push(`${failed} failed`);
  if (stale > 0) subtitleParts.push(`${stale} pending >30 min`);

  const tone = (s: Order["status"]) => (s === "fulfilled" ? "good" : s === "pending" ? "warn" : s === "failed" ? "bad" : "neutral");

  return (
    <section>
      <ToastHost />
      <PageHeader title="Orders" subtitle={subtitleParts.join(" · ")} />

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="oe-input flex-1"
          style={{ minWidth: "12rem" }}
          placeholder="Search by customer name or email…"
        />
        <select value={status} onChange={(e) => onStatusChange(e.target.value)} className="oe-input" style={{ width: "auto" }}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : "All statuses"}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading…</p>
      ) : (
        <Table head={<><Th>Customer</Th><Th>Package</Th><Th align="right">Amount</Th><Th align="center">Status</Th><Th align="right">Action</Th></>}>
          {orders.length === 0 ? (
            <EmptyRow cols={5}>{search || status ? "No orders match." : "No orders yet."}</EmptyRow>
          ) : orders.map((o) => (
            <tr key={o.id}>
              <Td>
                <div className="font-medium" style={{ color: "var(--ink)" }}>{o.customerName || o.customerEmail}</div>
                <div className="text-xs" style={{ color: "var(--ink-muted)" }}>{o.customerEmail}</div>
                {o.licenseId && <div className="mt-0.5 font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>License #{o.licenseId.slice(0, 8)}…</div>}
              </Td>
              <Td>
                {o.packageName}
                {o.domains.length > 0 && <div className="text-xs" style={{ color: "var(--ink-muted)" }}>{o.domains.join(", ")}</div>}
              </Td>
              <Td align="right" className="tabular-nums">{money(o.amountCents, o.currency)}</Td>
              <Td align="center">
                <div className="flex flex-col items-center gap-1">
                  <Badge tone={tone(o.status)}>{o.status}</Badge>
                  {o.stalePending && (
                    <span title="Pending for over 30 minutes — likely an abandoned checkout. Force-fulfill only mints if Stripe confirms payment.">
                      <Badge tone="warn">&gt;30 min</Badge>
                    </span>
                  )}
                  {o.status === "fulfilled" && (
                    <span
                      className="text-[11px]" style={{ color: "var(--ink-muted)" }}
                      title={o.licenseDelivered ? "The customer has fetched their key from the success page." : "Key minted and emailed; the customer hasn't opened the success page yet. Not a problem."}
                    >{o.licenseDelivered ? "key retrieved" : "key emailed"}</span>
                  )}
                </div>
              </Td>
              <Td align="right">
                {o.status === "pending" ? (
                  <Button size="sm" variant="primary" disabled={busyId === o.id} onClick={() => forceFulfill(o)}>
                    {busyId === o.id ? "…" : "Force-fulfill"}
                  </Button>
                ) : (
                  <span className="text-xs" style={{ color: "var(--ink-muted)" }}>—</span>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </section>
  );
}
