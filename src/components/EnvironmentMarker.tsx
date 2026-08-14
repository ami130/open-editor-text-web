"use client";

/**
 * EnvironmentMarker — publishes the backend's identity onto <body>.
 *
 * The admin panels are client components and cannot read the server-side
 * environment directly. Rather than have each one fetch /health (seven panels,
 * seven round-trips, seven chances to drift), the admin layout resolves it once
 * on the server and this writes it to `document.body.dataset` for
 * `confirmAction()` to read.
 *
 * Scoped to the admin layout deliberately — the public site has no business
 * carrying this, and the root layout is shared with it.
 *
 * Renders nothing. Cleans up on unmount so a client-side navigation out of
 * /admin does not leave a stale environment behind for anything else to read.
 */
import { useEffect } from "react";

export default function EnvironmentMarker(
  { name, host, kid }: { name: string; host: string; kid: string },
) {
  useEffect(() => {
    const b = document.body;
    if (!b) return undefined;
    if (name) b.dataset.oeEnv = name; else delete b.dataset.oeEnv;
    if (host) b.dataset.oeBackend = host; else delete b.dataset.oeBackend;
    if (kid) b.dataset.oeKid = kid; else delete b.dataset.oeKid;
    return () => {
      delete b.dataset.oeEnv;
      delete b.dataset.oeBackend;
      delete b.dataset.oeKid;
    };
  }, [name, host, kid]);

  return null;
}
