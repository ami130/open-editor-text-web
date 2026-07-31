"use client";

/** A logout button — POSTs to the BFF /api/auth/logout (revokes the backend
 *  session + clears the cookie), then sends the user to /login. */
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      onClick={logout} disabled={busy}
      className="rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60"
      style={{ border: "1px solid var(--edge)", color: "var(--ink)" }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
