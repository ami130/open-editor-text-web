/**
 * /checkout/cancel — Stripe sends the buyer here if they abandon checkout.
 * A calm, no-blame message with a link back to pricing. Public, static.
 */
import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-5">
      <div className="rounded-2xl p-7 text-center" style={{ background: "var(--paper-raised)", border: "1px solid var(--edge)" }}>
        <h1 className="text-xl font-semibold" style={{ color: "var(--ink)" }}>Checkout cancelled</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>No charge was made. You can pick a plan whenever you&apos;re ready.</p>
        <Link href="/pricing" className="btn-primary mt-5 inline-block rounded-lg px-4 py-2.5 text-sm font-medium">Back to pricing</Link>
      </div>
    </div>
  );
}
