"use client";

/** The admin shell: a grouped LEFT SIDEBAR (Overview / Sell / People / Operate)
 *  + a content area. Sections are permission-gated in the nav (the backend still
 *  enforces RBAC on every call — this just hides a tab that would only 403).
 *  Each section renders its existing panel; Overview is a new stats dashboard. */
import { useState } from "react";
import OverviewPanel from "./OverviewPanel";
import PackagesPanel from "./PackagesPanel";
import CustomersPanel from "./CustomersPanel";
import LicensesPanel from "./LicensesPanel";
import RolesPanel from "./RolesPanel";
import UsersPanel from "./UsersPanel";
import OrdersPanel from "./OrdersPanel";
import { hasPermission } from "@/lib/permissions";

type Section = "overview" | "packages" | "orders" | "customers" | "licenses" | "roles" | "users";
type NavItem = { id: Section; label: string; icon: string };
type NavGroup = { heading: string | null; items: NavItem[] };

const item = (id: Section, label: string, icon: string): NavItem => ({ id, label, icon });

export default function AdminDashboard({ permissions }: { permissions: string[] }) {
  const canOrders = hasPermission(permissions, "order.read");
  const canRoles = hasPermission(permissions, "role.read") || hasPermission(permissions, "role.manage");
  const canUsers = hasPermission(permissions, "user.read") || hasPermission(permissions, "user.manage");

  // Grouped navigation. Empty groups (all items gated out) are dropped below.
  const groups: NavGroup[] = [
    { heading: null, items: [item("overview", "Overview", "▦")] },
    {
      heading: "Sell",
      items: [
        item("packages", "Packages", "◫"),
        ...(canOrders ? [item("orders", "Orders", "▤")] : []),
      ],
    },
    {
      heading: "People",
      items: [item("customers", "Customers", "◍"), item("licenses", "Licenses", "⬡")],
    },
    {
      heading: "Operate",
      items: [
        ...(canRoles ? [item("roles", "Roles", "⛊")] : []),
        ...(canUsers ? [item("users", "Admin users", "◔")] : []),
      ],
    },
  ].filter((g) => g.items.length > 0);

  const [section, setSection] = useState<Section>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (id: Section) => { setSection(id); setMobileOpen(false); };

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      {/* Mobile nav toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="md:hidden rounded-lg px-3 py-2 text-sm font-medium"
        style={{ background: "var(--paper)", border: "1px solid var(--edge)", color: "var(--ink)" }}
        aria-expanded={mobileOpen}
      >
        ☰ Menu
      </button>

      {/* Sidebar */}
      <nav
        className={`${mobileOpen ? "block" : "hidden"} md:block md:sticky md:top-6 w-full md:w-56 shrink-0`}
        aria-label="Admin sections"
      >
        <div className="flex flex-col gap-5 rounded-xl p-3" style={{ background: "var(--paper)", border: "1px solid var(--edge)" }}>
          {groups.map((g, gi) => (
            <div key={g.heading ?? `g${gi}`} className="flex flex-col gap-0.5">
              {g.heading && (
                <div className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)", letterSpacing: ".08em" }}>
                  {g.heading}
                </div>
              )}
              {g.items.map((it) => {
                const active = section === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => go(it.id)}
                    aria-current={active ? "page" : undefined}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                    style={{
                      background: active ? "color-mix(in oklab, var(--brand) 14%, transparent)" : "transparent",
                      color: active ? "var(--brand)" : "var(--ink)",
                    }}
                  >
                    <span aria-hidden className="w-4 text-center" style={{ opacity: active ? 1 : 0.55 }}>{it.icon}</span>
                    {it.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {section === "overview" && <OverviewPanel permissions={permissions} onNavigate={go} />}
        {section === "packages" && <PackagesPanel />}
        {section === "orders" && canOrders && <OrdersPanel />}
        {section === "customers" && <CustomersPanel />}
        {section === "licenses" && <LicensesPanel />}
        {section === "roles" && canRoles && <RolesPanel canManage={hasPermission(permissions, "role.manage")} />}
        {section === "users" && canUsers && <UsersPanel canManage={hasPermission(permissions, "user.manage")} />}
      </div>
    </div>
  );
}
