"use client";

/**
 * /checkout/success — landed here by Stripe after payment. Reads ?session_id,
 * polls the backend until the (signature-verified) webhook has fulfilled the
 * order, then shows the license key ONCE with a copy button. The key is also
 * emailed. If fulfillment lags, we keep polling for a short while.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

interface LicenseResult {
  status: "unknown" | "pending" | "fulfilled" | "failed" | "expired";
  delivered?: boolean;
  planName?: string; licenseKey?: string; features?: string[]; domains?: string[];
}

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [result, setResult] = useState<LicenseResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const attempts = useRef(0);

  const poll = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/public/orders/${encodeURIComponent(sessionId)}/license`, { cache: "no-store" });
      const body: LicenseResult = await res.json();
      setResult(body);
      // Stop polling once we reach a terminal state (fulfilled/failed). Note the
      // key is single-use: the first fulfilled response carries it; we must NOT
      // poll again after that or the key is consumed with nowhere to show it.
      if (body.status === "fulfilled" || body.status === "failed") return true;
    } catch { /* keep polling */ }
    return false;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let live = true;
    // Poll up to ~30s (webhook is usually near-instant, but can lag a beat).
    const tick = async () => {
      if (!live) return;
      const done = await poll();
      attempts.current += 1;
      if (done || !live) return;
      if (attempts.current >= 20) { setGaveUp(true); return; }
      setTimeout(tick, 1500);
    };
    void Promise.resolve().then(tick);
    return () => { live = false; };
  }, [sessionId, poll]);

  const [copyFailed, setCopyFailed] = useState(false);
  async function copy() {
    if (!result?.licenseKey) return;
    try {
      // navigator.clipboard is only available in secure contexts (https/
      // localhost); guard + fall back to a "select it manually" hint.
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.licenseKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } else {
        setCopyFailed(true);
      }
    } catch {
      setCopyFailed(true);
    }
  }

  if (!sessionId) {
    return <Centered><p style={{ color: "var(--ink-muted)" }}>Missing checkout session.</p></Centered>;
  }

  const fulfilled = result?.status === "fulfilled" && !!result.licenseKey;
  // Already retrieved once (e.g. a reload / revisited link): key is not re-shown.
  const alreadyDelivered = result?.status === "fulfilled" && result.delivered === true;

  return (
    <Centered>
      <div className="w-full max-w-lg rounded-2xl p-7" style={{ background: "var(--paper-raised)", border: "1px solid var(--edge)" }}>
        {fulfilled ? (
          <>
            <h1 className="text-xl font-semibold" style={{ color: "var(--ink)" }}>Payment complete 🎉</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
              Your {result!.planName} license is ready. We&apos;ve emailed it too — copy it now to be safe.
            </p>
            <label className="mt-4 block text-xs font-medium" style={{ color: "var(--ink)" }}>License key</label>
            <textarea readOnly value={result!.licenseKey} rows={4}
              className="oe-input mt-1 w-full font-mono text-[11px]" onFocus={(e) => e.currentTarget.select()} />
            <button onClick={copy} className="btn-primary mt-3 rounded-lg px-4 py-2 text-sm font-medium">
              {copied ? "Copied!" : "Copy license key"}
            </button>
            {copyFailed && <p className="mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>Couldn&apos;t copy automatically — select the text above and copy it manually.</p>}
            {result!.domains && result!.domains.length > 0 && (
              <p className="mt-3 text-xs" style={{ color: "var(--ink-muted)" }}>Valid for: {result!.domains.join(", ")}</p>
            )}
          </>
        ) : alreadyDelivered ? (
          <>
            <h1 className="text-xl font-semibold" style={{ color: "var(--ink)" }}>Payment complete 🎉</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
              Your {result!.planName} license was already shown once and has been emailed to you. For security we don&apos;t display it again here — please check your inbox (reference <code>{sessionId}</code>).
            </p>
          </>
        ) : result?.status === "failed" ? (
          <>
            <h1 className="text-xl font-semibold" style={{ color: "var(--ink)" }}>Something went wrong</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
              Your payment was received but we couldn&apos;t issue the license automatically. Please contact support with this reference: <code>{sessionId}</code>.
            </p>
          </>
        ) : gaveUp ? (
          <>
            <h1 className="text-xl font-semibold" style={{ color: "var(--ink)" }}>Almost there…</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
              Your payment is confirmed; the license is taking a moment. Check your email shortly, or refresh this page. Reference: <code>{sessionId}</code>.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold" style={{ color: "var(--ink)" }}>Finalizing your purchase…</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>This only takes a second.</p>
          </>
        )}
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-5">{children}</div>;
}

export default function CheckoutSuccessPage() {
  return <Suspense fallback={null}><SuccessInner /></Suspense>;
}
