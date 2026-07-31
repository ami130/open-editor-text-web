"use client";

/**
 * /portal — self-serve customer sign-in (Phase 4b). Passwordless: enter your
 * email, we send a one-time magic link. The response is intentionally generic
 * (we never reveal whether an email has licenses), so the confirmation copy is
 * the same regardless.
 */
import { useState } from "react";

export default function PortalSignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/portal/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok && res.status !== 200) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Something went wrong. Please try again.");
      }
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--ink)" }}>Manage your licenses</h1>
      {sent ? (
        <p className="mt-4 text-sm" style={{ color: "var(--ink-muted)" }}>
          If that email has licenses, a one-time sign-in link is on its way. Check your inbox
          and click the link to continue. The link expires shortly and works once.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Enter the email you used at checkout and we&apos;ll send you a secure sign-in link.
          </p>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" className="oe-input" autoComplete="email"
          />
          {error && <p role="alert" className="text-sm" style={{ color: "#b3261e" }}>{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
            {busy ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>
      )}
    </main>
  );
}
