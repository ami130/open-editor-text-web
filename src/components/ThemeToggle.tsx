"use client";
/**
 * Site-wide theme switch: one click flips the ENTIRE website between light
 * and dark. The choice is persisted in localStorage and applied as
 * `data-theme` on <html>; an inline script in the root layout replays it
 * before first paint, so there is never a flash. First visit follows the OS.
 */
import { useEffect, useState } from "react";

type Mode = "light" | "dark";

const SunIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

export default function ThemeToggle() {
  // Server render can't know the saved mode; render a neutral placeholder
  // until mounted to avoid a hydration mismatch (the page theme itself is
  // already correct — the layout's inline script handled it).
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    // Resolve the current mode after mount (localStorage/matchMedia are
    // client-only). Deferred to a microtask so the effect body performs no
    // synchronous setState (react-hooks/set-state-in-effect).
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") setMode(saved);
      else setMode(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    });
    return () => { active = false; };
  }, []);

  const flip = () => {
    if (!mode) return;
    const next: Mode = mode === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setMode(next);
  };

  const label = mode === "dark" ? "Switch website to light mode" : "Switch website to dark mode";

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-(--paper-raised)"
      style={{ borderColor: "var(--edge)", color: "var(--ink-muted)" }}
    >
      {mode === null ? <span className="inline-block h-4 w-4" aria-hidden /> : mode === "dark" ? SunIcon : MoonIcon}
    </button>
  );
}
