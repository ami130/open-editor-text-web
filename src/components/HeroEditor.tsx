"use client";
/**
 * The landing hero: a REAL editor, fetched at runtime.
 *
 * ─── WHY THIS NO LONGER IMPORTS PLUGINS ─────────────────────────────────────
 * This used to mount the v1 engine from `node_modules` and hand it a hand-built
 * list of plugin factories (image, table, media, …). That is exactly what v2
 * removes: there is no engine on disk to import and no plugin to construct, so
 * the hero now opens a delivery session like any customer and asks for
 * `plugins: "all"`. The site depends on ONE package again.
 *
 * ─── THE TRADE-OFF THIS MAKES ───────────────────────────────────────────────
 * The old hero rendered from disk and could not fail. This one needs the
 * delivery API, so a cold backend shows a loading state and an unreachable one
 * shows a message. That is the honest depiction of the product — the landing
 * page now demonstrates the architecture it is selling rather than a different,
 * retired one. The failure path is deliberately quiet: a marketing page must
 * degrade to its copy, never to a stack trace.
 */
import { useEffect, useRef, useState } from "react";
import { useSiteTheme } from "./useSiteTheme";
import { HERO_CONTENT } from "./demoContent";

const ENDPOINT =
  process.env.NEXT_PUBLIC_DELIVERY_ENDPOINT ||
  "https://open-editor-text-backend-production.up.railway.app";

type LiveEditor = Awaited<ReturnType<
  Awaited<typeof import("openeditor-text")>["createEditor"]
>>;

export default function HeroEditor() {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<LiveEditor | null>(null);
  // The editor always follows the site's light/dark switch — one control
  // themes the whole website, editors included. (The editor's own 'auto'
  // theme only sees the OS preference, not our toggle, hence the hook.)
  const theme = useSiteTheme();
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  // ⚠️ Same StrictMode hazard as the demo: effects run twice in development and
  // `createEditor` is async, so a plain boolean flag is re-initialised by the
  // remount and guards nothing. A ref survives it and keeps ONE editor.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let disposed = false;

    void (async () => {
      try {
        const { createEditor } = await import("openeditor-text");
        const editor = await createEditor(hostRef.current!, {
          endpoint: ENDPOINT,
          plugins: "all",
          minHeight: 420,
          // `defaultContent` is the engine's construct-time option — the same
          // one the previous v1 hero used. (There is no `initialHTML`.)
          defaultContent: HERO_CONTENT,
        });
        // The visitor can navigate away mid-fetch; mounting into a detached
        // node would leak the editor and its listeners.
        if (disposed) { try { editor.destroy(); } catch { /* already gone */ } return; }
        editorRef.current = editor;
        setState("ready");
      } catch {
        setState("failed");
      }
    })();

    return () => {
      disposed = true;
      if (editorRef.current) {
        try { editorRef.current.destroy(); } catch { /* already gone */ }
        editorRef.current = null;
      }
    };
  }, []);

  // Theme is applied separately from mounting so toggling light/dark does not
  // tear down and refetch the engine.
  useEffect(() => {
    if (state !== "ready" || !editorRef.current) return;
    // setTheme is a documented engine method (openeditor-text-engine.d.ts:509).
    try { editorRef.current.setTheme(theme); } catch { /* mid-teardown */ }
  }, [theme, state]);

  return (
    <div className="flex flex-col gap-3">
      <div ref={hostRef} />
      {state === "loading" && (
        <div
          className="h-105 animate-pulse rounded-2xl border"
          style={{ borderColor: "var(--edge)", background: "var(--paper-raised)" }}
        />
      )}
      {state === "failed" && (
        <div
          className="rounded-2xl border p-6 text-center text-sm"
          style={{ borderColor: "var(--edge)", background: "var(--paper-raised)", color: "var(--ink-muted)" }}
        >
          The live editor could not be reached just now.{" "}
          <a href="/demo" className="underline">Try the full demo →</a>
        </div>
      )}
    </div>
  );
}
