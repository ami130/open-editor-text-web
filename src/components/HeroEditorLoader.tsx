"use client";
/** Client boundary: the editor needs a DOM, so it loads client-side only. */
import dynamic from "next/dynamic";

const HeroEditor = dynamic(() => import("./HeroEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-72 animate-pulse rounded-2xl border" style={{ borderColor: "var(--edge)", background: "var(--paper-raised)" }} />
  ),
});

export default function HeroEditorLoader() {
  return <HeroEditor />;
}
