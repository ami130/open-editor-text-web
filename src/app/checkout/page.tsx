"use client";

/**
 * /checkout — the EMBEDDED Stripe payment form, rendered ON OUR OWN SITE (no
 * redirect to checkout.stripe.com). The buyer's selection is handed here from
 * the /pricing dialog via sessionStorage (never a clientSecret in the URL).
 * This page:
 *   1. reads the pending selection (packageId/email/name/domains),
 *   2. POSTs it to /api/public/checkout to get a Stripe client_secret,
 *   3. loads Stripe.js with the PUBLISHABLE key from /api/public/billing-status,
 *   4. mounts <EmbeddedCheckout/> — Stripe iframes the card fields (PCI-safe),
 *   5. on payment completion Stripe navigates to the session's return_url
 *      (/checkout/success?session_id=…), where the license is polled for.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

const SELECTION_KEY = "oe:checkout:selection";

/** Cache the Stripe.js instance per publishable key (loadStripe must run once). */
let stripePromise: Promise<Stripe | null> | null = null;
let stripePromiseKey = "";
function getStripe(pk: string) {
  if (!stripePromise || stripePromiseKey !== pk) {
    stripePromise = loadStripe(pk);
    stripePromiseKey = pk;
  }
  return stripePromise;
}

interface Selection {
  packageId: string;
  packageName: string;
  email: string;
  name: string;
  domains: string[];
}

export default function CheckoutPage() {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-invoke creating two Stripe sessions.
    if (started.current) return;
    started.current = true;

    let active = true;
    (async () => {
      // 1. Read the selection handed over from /pricing.
      let sel: Selection | null = null;
      try {
        const raw = sessionStorage.getItem(SELECTION_KEY);
        if (raw) sel = JSON.parse(raw) as Selection;
      } catch { /* ignore malformed */ }
      if (!sel || !sel.packageId) {
        if (active) setError("no-selection");
        return;
      }
      if (active) setSelection(sel);

      // 2. Fetch the publishable key (billing-status) and create the session
      //    (checkout) in parallel.
      try {
        const [statusRes, checkoutRes] = await Promise.all([
          fetch("/api/public/billing-status", { cache: "no-store" }),
          fetch("/api/public/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packageId: sel.packageId, email: sel.email, name: sel.name, domains: sel.domains }),
          }),
        ]);
        const status = await statusRes.json().catch(() => ({}));
        const checkout = await checkoutRes.json().catch(() => ({}));
        if (!active) return;

        if (!status.publishableKey) {
          setError("Payments are not fully configured (missing publishable key). Contact the site owner.");
          return;
        }
        if (!checkoutRes.ok || !checkout.clientSecret) {
          setError(checkout.error || "Could not start checkout. Please try again.");
          return;
        }
        setStripe(getStripe(status.publishableKey));
        setClientSecret(checkout.clientSecret);
      } catch {
        if (active) setError("Could not reach the payment server.");
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <button
        onClick={() => router.push("/pricing")}
        className="mb-6 text-sm hover:underline"
        style={{ color: "var(--ink-muted)" }}
      >
        ← Back to pricing
      </button>

      {selection && (
        <h1 className="mb-2 text-2xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
          Checkout — {selection.packageName}
        </h1>
      )}

      {error === "no-selection" ? (
        <div className="rounded-xl p-6" style={{ background: "var(--paper-raised)", border: "1px solid var(--edge)" }}>
          <p style={{ color: "var(--ink)" }}>No plan selected.</p>
          <button onClick={() => router.push("/pricing")} className="btn-primary mt-4 rounded-lg px-4 py-2 text-sm font-medium">
            Choose a plan
          </button>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl p-4 text-sm" style={{ background: "color-mix(in oklab, #e53935 12%, var(--paper))", color: "#b3261e", border: "1px solid var(--edge)" }}>
          {error}
        </div>
      ) : clientSecret && stripe ? (
        <div className="rounded-xl p-1" style={{ background: "var(--paper-raised)", border: "1px solid var(--edge)" }}>
          <EmbeddedCheckoutProvider stripe={stripe} options={{ clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      ) : (
        <p style={{ color: "var(--ink-muted)" }}>Preparing secure checkout…</p>
      )}
    </div>
  );
}
