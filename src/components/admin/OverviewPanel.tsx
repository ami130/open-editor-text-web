"use client";

/** Overview dashboard: at-a-glance stats + recent orders + things needing
 *  attention (pending orders, flagged licenses). Pulls live data from the same
 *  /api/admin/* routes the panels use; degrades gracefully if a call is gated
 *  (403) by simply omitting that stat. Clicking a card jumps to its section. */
import { useEffect, useState } from "react";
import { apiGet, money, type Package, type License, type Order, type Customer } from "./types";
import { Card, StatCard, Badge, PageHeader, Table, Th, Td, EmptyRow } from "./ui";
import { hasPermission } from "@/lib/permissions";

type Section = "overview" | "packages" | "orders" | "customers" | "licenses" | "roles" | "users";

export default function OverviewPanel({ permissions, onNavigate }: { permissions: string[]; onNavigate: (s: Section) => void }) {
  const canOrders = hasPermission(permissions, "order.read");
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [licenses, setLicenses] = useState<License[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [loading, setLoading] = useState(true);


  /**
   * A `cancelled` guard rather than calling load() directly: setState must not
   * run after unmount, and react-hooks/set-state-in-effect flags the direct
   * form because a synchronous setState inside an effect causes a cascading
   * render. Same fix as DefaultPackageCard.
   */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const safe = <T,>(pr: Promise<T>) => pr.then((v) => v).catch(() => null);
      const [pk, lic, ord, cust] = await Promise.all([
        safe(apiGet<Package[]>("/api/admin/packages")),
        safe(apiGet<License[]>("/api/admin/licenses")),
        canOrders ? safe(apiGet<Order[]>("/api/admin/orders")) : Promise.resolve(null),
        safe(apiGet<Customer[]>("/api/admin/customers")),
      ]);
      if (cancelled) return;
      setPackages(pk); setLicenses(lic); setOrders(ord); setCustomers(cust);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [canOrders]);

  // Derived stats.
  const activeLicenses = licenses?.filter((l) => (l.effectiveStatus || l.status) === "active").length ?? 0;
  const flagged = licenses?.filter((l) => (l.flaggedAt ?? 0) > 0).length ?? 0;
  const pendingOrders = orders?.filter((o) => o.status === "pending").length ?? 0;
  const stalePending = orders?.filter((o) => o.status === "pending" && o.stalePending).length ?? 0;
  const fulfilled = orders?.filter((o) => o.status === "fulfilled") ?? [];
  const revenueCents = fulfilled.reduce((s, o) => s + (o.amountCents || 0), 0);
  const revenueCcy = fulfilled[0]?.currency || "USD";
  const livePackages = packages?.filter((p) => p.active && p.publiclyListed).length ?? 0;
  const recentOrders = (orders ?? []).slice(0, 6);

  const orderTone = (s: Order["status"]) =>
    s === "fulfilled" ? "good" : s === "pending" ? "warn" : s === "failed" ? "bad" : "neutral";

  return (
    <div>
      <PageHeader title="Overview" subtitle="A snapshot of your store, licenses, and anything that needs attention." />

      {loading ? (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Attention banner — only when something needs action */}
          {(stalePending > 0 || flagged > 0) && (
            <Card className="flex flex-wrap items-center gap-x-6 gap-y-2" >
              <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Needs attention</span>
              {stalePending > 0 && (
                <button
                  onClick={() => onNavigate("orders")}
                  className="text-sm hover:underline"
                  style={{ color: "#8a5200" }}
                  title="Orders that have been pending for over 30 minutes. Most are abandoned checkouts (never paid). Open Orders and use Force-fulfill — it only mints if Stripe confirms payment."
                >
                  ⚠ {stalePending} order{stalePending > 1 ? "s" : ""} pending &gt;30 min (may be abandoned) → review
                </button>
              )}
              {flagged > 0 && (
                <button onClick={() => onNavigate("licenses")} className="text-sm hover:underline" style={{ color: "#8a5200" }}>
                  ⚑ {flagged} license{flagged > 1 ? "s" : ""} flagged for sharing → review
                </button>
              )}
            </Card>
          )}

          {/* Stat grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button onClick={() => onNavigate("licenses")} className="text-left">
              <StatCard label="Active licenses" value={activeLicenses} hint={`${licenses?.length ?? 0} total`} icon="⬡" />
            </button>
            {canOrders && (
              <button onClick={() => onNavigate("orders")} className="text-left">
                <StatCard label="Revenue (fulfilled)" value={money(revenueCents, revenueCcy)} hint={`${fulfilled.length} paid orders`} tone="good" icon="＄" />
              </button>
            )}
            {canOrders && (
              <button onClick={() => onNavigate("orders")} className="text-left">
                <StatCard label="Pending orders" value={pendingOrders} hint={stalePending > 0 ? `${stalePending} over 30 min` : "awaiting payment"} tone={stalePending > 0 ? "warn" : "default"} icon="▤" />
              </button>
            )}
            <button onClick={() => onNavigate("customers")} className="text-left">
              <StatCard label="Customers" value={customers?.length ?? 0} hint={`${livePackages} live package${livePackages === 1 ? "" : "s"}`} icon="◍" />
            </button>
          </div>

          {/* Recent orders */}
          {canOrders && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Recent orders</h3>
                <button onClick={() => onNavigate("orders")} className="text-xs font-medium hover:underline" style={{ color: "var(--brand)" }}>View all →</button>
              </div>
              <Table head={<><Th>Customer</Th><Th>Package</Th><Th align="right">Amount</Th><Th align="center">Status</Th></>}>
                {recentOrders.length === 0 ? (
                  <EmptyRow cols={4}>No orders yet.</EmptyRow>
                ) : recentOrders.map((o) => (
                  <tr key={o.id}>
                    <Td>{o.customerEmail}</Td>
                    <Td>{o.packageName}</Td>
                    <Td align="right" className="tabular-nums">{money(o.amountCents, o.currency)}</Td>
                    <Td align="center"><Badge tone={orderTone(o.status)}>{o.status}</Badge></Td>
                  </tr>
                ))}
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
