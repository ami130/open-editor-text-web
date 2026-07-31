import type { Metadata } from "next";
import PlaygroundLoader from "@/components/PlaygroundLoader";

export const metadata: Metadata = {
  title: "Playground — Open Editor",
  description: "Try every Open Editor feature live: toggle plugins, themes, languages — and copy the exact config for what you built.",
};

export default function PlaygroundPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 py-10 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
      <p className="mt-2 mb-8 max-w-prose" style={{ color: "var(--ink-muted)" }}>
        Toggle anything. The editor rebuilds live, and the code panel always shows
        exactly what you&apos;d ship.
      </p>
      <PlaygroundLoader />
    </div>
  );
}
