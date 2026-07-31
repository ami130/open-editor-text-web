"use client";
/**
 * Resolves the site's effective theme ("light" | "dark") from the
 * `data-theme` attribute the ThemeToggle manages, falling back to the OS
 * preference when no explicit choice is set. Stays live: reacts to both the
 * toggle and OS-level changes. Lets the embedded editors follow the page
 * instead of only the OS (the editor's own 'auto' theme can't see our toggle).
 */
import { useEffect, useState } from "react";

export type SiteTheme = "light" | "dark";

export function resolveSiteTheme(): SiteTheme {
  if (typeof window === "undefined") return "light";
  const forced = document.documentElement.getAttribute("data-theme");
  if (forced === "dark" || forced === "light") return forced;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useSiteTheme(): SiteTheme {
  const [theme, setTheme] = useState<SiteTheme>(resolveSiteTheme);

  useEffect(() => {
    const update = () => setTheme(resolveSiteTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    mq.addEventListener("change", update);
    update();
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);

  return theme;
}
