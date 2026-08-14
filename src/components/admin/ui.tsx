"use client";

/** Shared admin UI kit: layout primitives (Card, StatCard, Table, Badge,
 *  PageHeader, Button) + a copy-to-clipboard button and a lightweight toast
 *  system. Every panel builds on these so the whole admin looks unified.
 *  No external deps; styled entirely through the app's CSS theme variables. */
import { useCallback, useState, type ReactNode } from "react";

/* ── Layout primitives ─────────────────────────────────────────────────── */

/** A page/section header: title, optional subtitle, optional right-aligned action. */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm" style={{ color: "var(--ink-muted)" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** A raised surface with a consistent border/radius/shadow. */
export function Card({ children, className = "", pad = true, style }: { children: ReactNode; className?: string; pad?: boolean; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-xl ${pad ? "p-5" : ""} ${className}`}
      style={{ background: "var(--paper)", border: "1px solid var(--edge)", boxShadow: "0 1px 2px rgba(16,18,26,.04)", ...style }}
    >
      {children}
    </div>
  );
}

/** A stat tile for the dashboard: big number + label, optional hint + accent. */
export function StatCard({ label, value, hint, tone = "default", icon }: {
  label: string; value: ReactNode; hint?: string; tone?: "default" | "warn" | "good"; icon?: ReactNode;
}) {
  const toneColor = tone === "warn" ? "#b26a00" : tone === "good" ? "#137333" : "var(--ink)";
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)", letterSpacing: ".04em" }}>{label}</span>
        {icon && <span aria-hidden style={{ color: "var(--ink-muted)" }}>{icon}</span>}
      </div>
      <span className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: toneColor }}>{value}</span>
      {hint && <span className="text-xs" style={{ color: "var(--ink-muted)" }}>{hint}</span>}
    </Card>
  );
}

/** A colored status pill. `tone` maps to a semantic color; unknown → neutral. */
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "brand" }) {
  const map: Record<string, { bg: string; fg: string }> = {
    good: { bg: "color-mix(in oklab, #137333 14%, transparent)", fg: "#137333" },
    warn: { bg: "color-mix(in oklab, #b26a00 16%, transparent)", fg: "#8a5200" },
    bad: { bg: "color-mix(in oklab, #d93025 14%, transparent)", fg: "#c5221f" },
    brand: { bg: "color-mix(in oklab, var(--brand) 16%, transparent)", fg: "var(--brand)" },
    neutral: { bg: "var(--paper-raised)", fg: "var(--ink-muted)" },
  };
  const c = map[tone] || map.neutral;
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: c.bg, color: c.fg }}>
      {children}
    </span>
  );
}

/** A styled button. `variant`: primary (filled brand) / ghost (bordered) / danger. */
export function Button({ children, variant = "ghost", size = "md", ...rest }: {
  children: ReactNode; variant?: "primary" | "ghost" | "danger"; size?: "sm" | "md";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm";
  const style: React.CSSProperties =
    variant === "primary" ? { background: "var(--brand-solid)", color: "#fff", border: "1px solid var(--brand-solid)" }
    : variant === "danger" ? { background: "transparent", color: "#c5221f", border: "1px solid color-mix(in oklab, #d93025 40%, var(--edge))" }
    : { background: "var(--paper)", color: "var(--ink)", border: "1px solid var(--edge)" };
  return (
    <button
      {...rest}
      className={`rounded-lg font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${pad} ${rest.className || ""}`}
      style={{ ...style, ...(rest.style || {}) }}
    >
      {children}
    </button>
  );
}

/** A responsive table shell (horizontal-scroll wrapper + consistent header). */
export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--edge)" }}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr style={{ background: "var(--paper-raised)" }}>{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** A header cell. */
export function Th({ children, align = "left" }: { children?: ReactNode; align?: "left" | "right" | "center" }) {
  return (
    <th
      className="px-4 py-2.5 text-xs font-semibold uppercase"
      style={{ color: "var(--ink-muted)", textAlign: align, letterSpacing: ".03em", borderBottom: "1px solid var(--edge)" }}
    >
      {children}
    </th>
  );
}

/** A body cell. */
export function Td({ children, align = "left", className = "" }: { children?: ReactNode; align?: "left" | "right" | "center"; className?: string }) {
  return (
    <td className={`px-4 py-3 ${className}`} style={{ color: "var(--ink)", textAlign: align, borderBottom: "1px solid var(--edge)", verticalAlign: "middle" }}>
      {children}
    </td>
  );
}

/** An empty-state row (spans the table). */
export function EmptyRow({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-sm" style={{ color: "var(--ink-muted)" }}>{children}</td>
    </tr>
  );
}


/** A button that copies `value` to the clipboard and flashes "Copied ✓". */
export function CopyButton({ value, label = "Copy", className = "" }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be blocked (insecure context / permissions) — fall
      // back to a transient select+execCommand via a hidden textarea.
      try {
        const ta = document.createElement("textarea");
        ta.value = value; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true); setTimeout(() => setCopied(false), 1500);
      } catch { /* give up quietly — the value is still visible to select manually */ }
    }
  }, [value]);
  return (
    <button
      type="button" onClick={copy}
      className={`rounded-md px-2 py-1 text-xs font-medium ${className}`}
      style={{ border: "1px solid var(--edge)", color: copied ? "#137333" : "var(--brand)" }}
      aria-live="polite"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

export type Toast = { id: number; kind: "success" | "error"; message: string };

/** Per-panel toast state. Returns { toasts, notify, ToastHost }. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((kind: Toast["kind"], message: string) => {
    // Date.now-free monotonic id (Date.now is fine in the browser, but a
    // counter avoids any collision on same-tick double-fires).
    setToasts((prev) => {
      const id = (prev[prev.length - 1]?.id ?? 0) + 1;
      const next = [...prev, { id, kind, message }];
      // auto-dismiss after 3s
      setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 3000);
      return next;
    });
  }, []);
  const dismiss = useCallback((id: number) => setToasts((cur) => cur.filter((t) => t.id !== id)), []);

  function ToastHost() {
    if (toasts.length === 0) return null;
    return (
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            onClick={() => dismiss(t.id)}
            className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg"
            style={{
              background: t.kind === "error"
                ? "color-mix(in oklab, #e53935 16%, var(--paper-raised))"
                : "color-mix(in oklab, #137333 16%, var(--paper-raised))",
              color: t.kind === "error" ? "#b3261e" : "#0f5c2a",
              border: "1px solid var(--edge)",
              maxWidth: "24rem",
            }}
          >
            {t.kind === "error" ? "⚠ " : "✓ "}{t.message}
          </div>
        ))}
      </div>
    );
  }

  return { notify, ToastHost };
}

/* ── Destructive-action confirmation ───────────────────────────────────── */

/**
 * Confirm a destructive action, naming the environment it will happen in.
 *
 * ─── WHY ────────────────────────────────────────────────────────────────
 * The banner at the top of the admin page says which backend you are on. The
 * confirm dialog is where the mistake actually happens — you are looking at
 * the dialog, not at the banner, at the moment you decide. Revoking a licence
 * or deleting a package on the wrong backend is unrecoverable in the direction
 * that matters (a revoked licence "can never be un-revoked").
 *
 * Reads the environment the SERVER put on <body> rather than any client-side
 * guess: only the backend can honestly say which backend it is, and a
 * frontend-side label would keep saying "production" while pointed elsewhere.
 *
 * On production it adds a plain "PRODUCTION —" prefix rather than staying
 * silent: this is the one dialog where the real environment matters most, and
 * silence there is what makes a wrong-environment click possible.
 */
export function confirmAction(message: string): boolean {
  if (typeof document === "undefined") return false;

  const env = document.body?.dataset?.oeEnv || "";
  const host = document.body?.dataset?.oeBackend || "";

  // No environment reported → say so rather than implying production. An
  // unidentified backend is exactly when a confirmation should give pause.
  const header = !env
    ? `⚠️ UNIDENTIFIED BACKEND${host ? ` (${host})` : ""}\n\n`
    : env === "production"
      ? `PRODUCTION${host ? ` — ${host}` : ""}\n\n`
      : `⚠️ ${env.toUpperCase()} — NOT PRODUCTION${host ? ` (${host})` : ""}\n\n`;

  return window.confirm(header + message);
}
