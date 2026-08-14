"use client";
import dynamic from "next/dynamic";

// ssr:false is REQUIRED here, not stylistic: the loader reads IndexedDB and
// WebCrypto and mounts into a real element, none of which exist on the server.
const RuntimeDemo = dynamic(() => import("./RuntimeDemo"), {
  ssr: false,
  loading: () => (
    <div
      className="h-160 animate-pulse rounded-2xl border"
      style={{ borderColor: "var(--edge)", background: "var(--paper-raised)" }}
    />
  ),
});

export default function RuntimeDemoLoader() {
  return <RuntimeDemo />;
}
