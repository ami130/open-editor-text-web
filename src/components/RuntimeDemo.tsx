"use client";

/**
 * RuntimeDemo — what a REAL customer gets from `npm install openeditor-text`.
 *
 * ─── WHAT IT IS BUILT TO PROVE ──────────────────────────────────────────────
 * That the npm package contains no engine. The visitor sees a working editor
 * that was not in the bundle a moment ago, and DevTools → Network shows where
 * it came from: `POST /delivery/session`, then the engine itself.
 *
 * ─── WHY THERE IS NO METRICS PANEL ──────────────────────────────────────────
 * There used to be a "This page load" readout (plan, digest, bytes, timing).
 * It cost a SECOND `openSession` call on every load, purely to have numbers to
 * print — a round-trip no real integration makes. The proof lives in the
 * Network tab, which is the more convincing place for it anyway, so the panel
 * and its extra request are both gone. `createEditor` now opens the one
 * session a customer would open, and nothing more.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const ENDPOINT =
  process.env.NEXT_PUBLIC_DELIVERY_ENDPOINT ||
  "https://open-editor-text-backend-production.up.railway.app";

/** The live editor, as returned by createEditor. */
type LiveEditor = Awaited<ReturnType<
  Awaited<typeof import("openeditor-text")>["createEditor"]
>>;

export default function RuntimeDemo() {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<LiveEditor | null>(null);
  const [licenceKey, setLicenceKey] = useState("");
  const [applied, setApplied] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async (key: string) => {
    setBusy(true);
    setError(null);
    try {
      // The ONLY import from the npm package. Everything the editor can do
      // arrives over the network after this call.
      const { createEditor } = await import("openeditor-text");

      // Tear the previous editor down properly before mounting another.
      // Wiping innerHTML alone would orphan its listeners and its entitlement
      // stream, and "Apply key" remounts on every click.
      if (editorRef.current) {
        try { editorRef.current.destroy(); } catch { /* already gone */ }
        editorRef.current = null;
      }
      if (hostRef.current) hostRef.current.innerHTML = "";
      editorRef.current = await createEditor(hostRef.current!, {
        endpoint: ENDPOINT,
        ...(key ? { licenceKey: key } : {}),
        plugins: "all",
        minHeight: 320,
      });

      // Expose the live editor for debugging and end-to-end checks. This page
      // exists to make the delivery mechanism inspectable, so a handle to poke
      // at in the console belongs here — it grants nothing the visitor could
      // not already reach through the DOM.
      (window as unknown as { __oeEditor?: unknown }).__oeEditor = editorRef.current;

      setApplied(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the editor");
    } finally {
      setBusy(false);
    }
  }, []);

  // ⚠️ StrictMode runs effects TWICE in development, and `load` is async, so a
  // naive `cancelled` flag checked before the await does nothing: both runs
  // reach createEditor and the page renders TWO editors. A `useRef` guard is
  // used rather than a flag because it survives the remount that StrictMode
  // does between the two runs — a flag is re-initialised and guards nothing.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void load("");
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div
        className="rounded-xl p-4"
        style={{ border: "1px solid var(--edge)", background: "var(--paper-raised)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
          What <code>npm install openeditor-text</code> actually installs
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
          A ~208&nbsp;KB loader with <strong>zero dependencies</strong> and no editor inside it.
          The engine below was downloaded from the delivery API when this page loaded, and its
          SHA-256 was verified before a single byte ran. Open DevTools → Network and you will see
          exactly two requests: <code>POST /delivery/session</code>, then the engine bundle.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          <div ref={hostRef} />
          {busy && (
            <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
              Fetching the engine…
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm" style={{ color: "#b3261e" }}>
              {error}
            </p>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div
            className="rounded-xl p-4"
            style={{ border: "1px solid var(--edge)", background: "var(--paper-raised)" }}
          >
            <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              Try a licence key
            </h3>
            <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
              Same install, different entitlement. Paste a key and the server decides what to
              send — watch the toolbar change.
            </p>
            <textarea
              value={licenceKey}
              onChange={(e) => setLicenceKey(e.target.value)}
              rows={3}
              placeholder="paste a licence key…"
              spellCheck={false}
              className="oe-input mt-2 font-mono text-[11px]"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={busy || !licenceKey.trim()}
                onClick={() => void load(licenceKey.trim())}
                className="btn-primary rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60"
              >
                {busy ? "Loading…" : "Apply key"}
              </button>
              {applied && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { setLicenceKey(""); void load(""); }}
                  className="rounded-lg px-3 py-1.5 text-sm"
                  style={{ border: "1px solid var(--edge)", color: "var(--ink)" }}
                >
                  Reset to free
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
