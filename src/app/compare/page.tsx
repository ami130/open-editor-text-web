import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare — Open Editor vs CKEditor vs Jodit",
  description: "A feature-by-feature comparison, with live proof for every claim.",
};

type Row = [feature: string, oe: string, ck: string, jodit: string, proof?: string];
const ROWS: Row[] = [
  ["License key required", "Never", "Yes — even for the GPL tier", "No (MIT core)"],
  ["Core size (min+gzip)", "~61 KB", "~200 KB+", "~100 KB"],
  ["Runtime dependencies", "0", "Multiple internal packages", "0"],
  ["Slash commands", "✓ Free", "Paid", "Paid (PRO)", "/demo"],
  ["To-do lists", "✓ Free", "✓ Free", "Paid (PRO)", "/demo"],
  ["Change case", "✓ Free", "Paid", "Paid (PRO)", "/demo"],
  ["Format painter", "✓ Free", "Paid", "✓ Free", "/demo"],
  ["Source view w/ highlighting", "✓ Free, zero-dep", "Paid (enhanced)", "Free (needs ACE from CDN)", "/demo"],
  ["Typing autocorrect", "✓ Free", "✓ Free", "—", "/demo"],
  ["Markdown export", "✓ Free (getMarkdown)", "Free (data format)", "—"],
  ["@Mentions", "✓ Free", "Free UI (paid backend)", "Paid (PRO)", "/demo"],
  ["UI locale packs", "5 incl. RTL Arabic", "38", "30+", "/demo"],
  ["WCAG conformance statement", "✓ Published + CI-enforced", "✓ (VPAT)", "—", "/docs/ACCESSIBILITY"],
  ["Built-in XSS sanitizer", "✓ Adversarially CI-tested", "Partial (integrator's job)", "Hooks only", "/docs/SECURITY"],
  ["Telemetry / phone-home", "None", "License checks", "None"],
];

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-3xl font-bold tracking-tight">The honest comparison</h1>
      <p className="mt-2 mb-8 max-w-prose" style={{ color: "var(--ink-muted)" }}>
        Compiled 2026-07 against CKEditor 5 (v48) and Jodit 4. Sizes are measured
        minified+gzip. Where a row says “free here,” you can verify it in the
        live demo right now — that&apos;s what the proof links are.
      </p>
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--edge)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--paper-raised)" }}>
              {["Feature", "Open Editor", "CKEditor 5", "Jodit 4", "Proof"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([f, oe, ck, jd, proof]) => (
              <tr key={f} className="border-t transition-colors hover:bg-(--paper-raised)" style={{ borderColor: "var(--edge)" }}>
                <td className="px-4 py-2.5 font-medium">{f}</td>
                <td className="px-4 py-2.5" style={{ color: "var(--brand)" }}>{oe}</td>
                <td className="px-4 py-2.5" style={{ color: "var(--ink-muted)" }}>{ck}</td>
                <td className="px-4 py-2.5" style={{ color: "var(--ink-muted)" }}>{jd}</td>
                <td className="px-4 py-2.5">
                  {proof ? <Link href={proof} className="underline underline-offset-4" style={{ color: "var(--brand)" }}>see it live</Link> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-xs" style={{ color: "var(--ink-muted)" }}>
        Corrections welcome — this table only works if it stays honest. Competitor
        capabilities move; if a cell is stale, it gets fixed.
      </p>
    </div>
  );
}
