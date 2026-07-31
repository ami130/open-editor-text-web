"use client";

/**
 * /login — admin sign-in. Posts to the same-origin BFF route (/api/auth/login),
 * which sets the httpOnly session cookie; then we navigate to the area the
 * server will route us to (proxy.ts sends admins → /admin, users → /profile).
 * No tokens are ever handled in this client code.
 */
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hasAdminAccess } from "@/lib/permissions";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error || "Login failed");
        return;
      }
      const body = await res.json();
      const perms: string[] = body.permissions || [];
      const isAdmin = hasAdminAccess(perms);
      const next = params.get("next");
      // Only allow a SAME-ORIGIN relative path. `startsWith("/")` alone accepts
      // `//evil.com` and `/\evil.com` (browsers fold `\`→`/`), which router.replace
      // resolves OFF-ORIGIN — an open redirect. Require exactly one leading slash
      // not followed by another slash or backslash.
      const safeNext = next && /^\/(?![/\\])/.test(next) ? next : null;
      router.replace(safeNext ?? (isAdmin ? "/admin" : "/profile"));
    } catch {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-5">
      <div className="card rounded-2xl p-7" style={{ background: "var(--paper-raised)", border: "1px solid var(--edge)" }}>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>Admin sign in</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>Sign in to manage packages and licenses.</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--ink)" }}>
            Email
            <input
              type="email" autoComplete="username" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: "1.5px solid var(--edge)", background: "var(--paper)", color: "var(--ink)" }}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--ink)" }}>
            Password
            <input
              type="password" autoComplete="current-password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: "1.5px solid var(--edge)", background: "var(--paper)", color: "var(--ink)" }}
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg px-3 py-2 text-sm" style={{ background: "color-mix(in oklab, #e53935 12%, var(--paper))", color: "#b3261e" }}>
              {error}
            </p>
          )}

          <button
            type="submit" disabled={busy}
            className="btn-primary mt-1 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
