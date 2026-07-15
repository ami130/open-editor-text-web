"use client";
import dynamic from "next/dynamic";

const Playground = dynamic(() => import("./Playground"), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse rounded-2xl border" style={{ borderColor: "var(--edge)", background: "var(--paper-raised)" }} />,
});

export default function PlaygroundLoader() {
  return <Playground />;
}
