"use client";

/**
 * /portal/verify?token=… — the page the magic link points at. It POSTs the
 * token to the BFF (which consumes it, sets the httpOnly customer session, and
 * strips the token from the response), then routes to the licenses page. On
 * failure (expired/used link) it explains and links back to sign in.
 */
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // consume exactly once (StrictMode double-invoke guard)
    ran.current = true;
    // Defer to a microtask so the effect body performs no synchronous setState
    // (satisfies react-hooks/set-state-in-effect, matching the repo convention).
    void Promise.resolve().then(async () => {
      if (!token) { setError("This link is missing its token."); return; }
      try {
        const res = await fetch("/api/portal/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.error || "This link has expired or was already used.");
        }
        router.replace("/portal/licenses");
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }, [token, router]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      {error ? (
        <>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--ink)" }}>Sign-in link problem</h1>
          <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>{error}</p>
          <a href="/portal" className="btn-primary mt-4 inline-block rounded-lg px-4 py-2 text-sm font-medium">Request a new link</a>
        </>
      ) : (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Signing you in…</p>
      )}
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<main className="p-8 text-sm">Signing you in…</main>}>
      <VerifyInner />
    </Suspense>
  );
}
