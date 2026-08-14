import type { Metadata } from "next";
import RuntimeDemoLoader from "@/components/RuntimeDemoLoader";

export const metadata: Metadata = {
  title: "Live demo — Open Editor",
  description:
    "The real openeditor-text package: a 208 KB loader that fetches and SHA-256 verifies the editor engine at runtime. Paste a licence key and watch the served bundle change.",
};

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 py-10 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Live demo</h1>
      <p className="mt-2 mb-8 max-w-prose" style={{ color: "var(--ink-muted)" }}>
        This page runs the published <code>openeditor-text</code> package exactly as a
        customer would — nothing is bundled, mocked, or pre-loaded. Everything the
        editor can do was fetched from the delivery API after this page opened.
      </p>
      <RuntimeDemoLoader />
    </div>
  );
}
