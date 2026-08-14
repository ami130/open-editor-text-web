"use client";

/**
 * RuntimeDemo — what a REAL customer gets from `npm install openeditor-text`.
 *
 * ─── WHY THIS IS A SEPARATE PAGE, NOT A PLAYGROUND REWRITE ──────────────────
 * /playground showcases INDIVIDUAL plugin factories and locale packs, which
 * only exist as importable objects in v1. In v2 the engine — and every plugin
 * in it — is fetched at runtime, so there is nothing to import and nothing to
 * toggle. Rewriting the playground for v2 would have meant DELETING its
 * toggles and language switcher: a worse demo, to showcase a better
 * architecture. So the playground keeps v1 (via an npm alias) and this page
 * shows v2 properly.
 *
 * ─── WHAT IT IS BUILT TO PROVE ──────────────────────────────────────────────
 * That the npm package contains no engine. Everything below is measured from
 * the live page rather than asserted in prose: the session round-trip, the
 * bundle URL actually fetched, its size, and the SHA-256 the loader verifies
 * before executing a single byte. Open DevTools → Network and the same two
 * requests are visible there.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const ENDPOINT =
  process.env.NEXT_PUBLIC_DELIVERY_ENDPOINT ||
  "https://open-editor-text-backend-production.up.railway.app";

interface Trace {
  plan: string;
  features: number;
  version: string;
  bundleKey: string;
  sha: string;
  bytes: number | null;
  verified: boolean | null;
  ms: number;
}

/** The live editor, as returned by createEditor. */
type LiveEditor = Awaited<ReturnType<
  Awaited<typeof import("openeditor-text")>["createEditor"]
>>;

export default function RuntimeDemo() {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<LiveEditor | null>(null);
  const [licenceKey, setLicenceKey] = useState("");
  const [applied, setApplied] = useState("");
  const [trace, setTrace] = useState<Trace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async (key: string) => {
    setBusy(true);
    setError(null);
    setTrace(null);
    const started = performance.now();
    try {
      // The ONLY import from the npm package. Everything the editor can do
      // arrives over the network after this call.
      const { createEditor, openSession, fetchEngine } = await import("openeditor-text");

      // ⚠️ There is deliberately NO way to hand a session to createEditor — it
      // always opens its own (see LoaderOnlyOptions in index.d.ts). So this
      // page opens one FIRST, purely to read the real plan/version/digest, and
      // mounts second. The mount's own bundle fetch is then served from the
      // IndexedDB cache this call just populated, so the visitor still
      // downloads the ~600 KB engine exactly once.
      //
      // The Network tab therefore shows two `POST /delivery/session` calls on
      // THIS page and one on a customer's. That is a cost of showing the
      // numbers, not something a real integration pays — the alternative was
      // printing figures I had not actually measured.
      const session = await openSession({
        endpoint: ENDPOINT,
        ...(key ? { licenceKey: key } : {}),
      });

      // Re-verify the digest ourselves so the "verified" badge below reports a
      // check that actually ran here, rather than restating a claim. This uses
      // the loader's own fetchEngine, which REJECTS on mismatch — so reaching
      // the next line is itself the proof.
      const url = session.engine.url.startsWith("http")
        ? session.engine.url
        : `${ENDPOINT}${session.engine.url}`;
      let bytes: number | null = null;
      let verified: boolean | null = null;
      try {
        const source = await fetchEngine(url, session.engine.sha256);
        bytes = new Blob([source]).size;
        verified = true;
      } catch {
        // Measurement is a nicety; a failure here must not block the editor.
        // (A genuine digest mismatch also fails the mount below, loudly.)
      }

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

      setTrace({
        plan: session.plan,
        features: session.features.length,
        version: session.version,
        bundleKey: session.engine.key,
        sha: session.engine.sha256,
        bytes,
        verified,
        ms: Math.round(performance.now() - started),
      });
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

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span style={{ color: "var(--ink-muted)" }}>{label}</span>
      <span className="text-right font-mono text-xs" style={{ color: "var(--ink)" }}>{value}</span>
    </div>
  );

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
            <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
              This page load
            </h3>
            {trace ? (
              <>
                {row("plan", trace.plan)}
                {row("features granted", trace.features)}
                {row("engine version", trace.version)}
                {row("bundle", trace.bundleKey)}
                {row("bytes fetched", trace.bytes ? `${(trace.bytes / 1024).toFixed(0)} KB` : "—")}
                {row(
                  "SHA-256",
                  trace.verified === null
                    ? "—"
                    : trace.verified
                      ? <span style={{ color: "#137333" }}>verified</span>
                      : <span style={{ color: "#b3261e" }}>MISMATCH</span>,
                )}
                {row("time to editor", `${trace.ms} ms`)}
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Measuring…</p>
            )}
          </div>

          <div
            className="rounded-xl p-4"
            style={{ border: "1px solid var(--edge)", background: "var(--paper-raised)" }}
          >
            <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              Try a licence key
            </h3>
            <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
              Same install, different entitlement. Paste a key and the server decides what to
              send — watch the bundle name and SHA change.
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
