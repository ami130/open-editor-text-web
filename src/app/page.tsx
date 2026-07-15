import Link from "next/link";
import HeroEditorLoader from "@/components/HeroEditorLoader";

const CLAIMS = [
  { n: "0", label: "runtime dependencies", d: "One package. Nothing else lands in your node_modules." },
  { n: "61 KB", label: "core, minified + gzipped", d: "Smaller than Jodit (~100 KB) and CKEditor (~200 KB+). Tree-shaken, measured, CI-gated." },
  { n: "2,800+", label: "tests in CI", d: "Unit, cross-browser e2e, XSS sweeps, axe accessibility audits, size budgets." },
  { n: "0", label: "license keys or telemetry", d: "npm install and go. The free tier never phones home. MIT." },
];

const FEATURES = [
  ["Modern UX", "Slash commands, markdown-as-you-type, @mentions, to-do lists, block drag-reorder."],
  ["Security-first", "Input and output sanitized: XSS vectors, URL schemes, mXSS double-parse — adversarially tested."],
  ["Accessible", "WCAG 2.1 AA statement backed by an axe-core sweep of every surface, in CI."],
  ["19 plugins in the box", "Images, tables, links, embeds, find & replace, source view, code blocks, and more — all free."],
  ["Speaks your language", "Spanish, French, German, Arabic packs included; full RTL; bring-your-own locale."],
  ["Framework-native", "Official React, Vue, and Angular wrappers — caret-stable controlled modes, proven live."],
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-5">
      <section className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="mb-3 text-sm font-medium" style={{ color: "var(--brand)" }}>
            Open source · MIT · v1.1.0 on npm
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl" style={{ textWrap: "balance" }}>
            The rich text editor with nothing to hide in your bundle.
          </h1>
          <p className="mt-5 max-w-prose text-lg leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            Pure JavaScript. Zero dependencies. No license key. Smaller, safer, and more
            accessible than the editors you&apos;re comparing it against — with the
            measurements to prove every word of that sentence.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/playground"
              className="rounded-xl px-5 py-3 font-medium text-white shadow-sm"
              style={{ background: "var(--brand)" }}
            >
              Try the playground
            </Link>
            <code className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--edge)", background: "var(--paper-raised)" }}>
              npm install @open-editor-hq/core
            </code>
          </div>
        </div>
        <HeroEditorLoader />
      </section>

      <section className="grid gap-px overflow-hidden rounded-2xl border md:grid-cols-4" style={{ borderColor: "var(--edge)", background: "var(--edge)" }}>
        {CLAIMS.map((c) => (
          <div key={c.label} className="p-6" style={{ background: "var(--paper)" }}>
            <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--brand)" }}>{c.n}</div>
            <div className="mt-1 font-medium">{c.label}</div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>{c.d}</p>
          </div>
        ))}
      </section>

      <section className="py-20">
        <h2 className="text-2xl font-bold tracking-tight">Everything in the box, nothing behind a key</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, d]) => (
            <div key={t} className="rounded-xl border p-5" style={{ borderColor: "var(--edge)" }}>
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm" style={{ color: "var(--ink-muted)" }}>
          Skeptical? Good. <Link href="/compare" className="underline underline-offset-4" style={{ color: "var(--brand)" }}>See the feature-by-feature comparison</Link> — every row links to live proof.
        </p>
      </section>
    </div>
  );
}
