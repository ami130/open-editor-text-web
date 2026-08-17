import Link from "next/link";
import HeroEditorLoader from "@/components/HeroEditorLoader";

const CLAIMS = [
  { n: "0", label: "runtime dependencies", d: "One package. Nothing else lands in your node_modules." },
  { n: "61 KB", label: "core, minified + gzipped", d: "Smaller than Jodit (~100 KB) and CKEditor (~200 KB+). Tree-shaken, measured, CI-gated." },
  { n: "2,800+", label: "tests in CI", d: "Unit, cross-browser e2e, XSS sweeps, axe accessibility audits, size budgets." },
  { n: "0", label: "license keys or telemetry", d: "npm install and go. The free tier never phones home. MIT." },
];

const FEATURES: Array<[title: string, desc: string, icon: React.ReactNode]> = [
  ["Modern UX", "Slash commands, markdown-as-you-type, @mentions, to-do lists, block drag-reorder.", (
    <path key="i" d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 15l.95 2.55L22.5 18.5l-2.55.95L19 22l-.95-2.55L15.5 18.5l2.55-.95L19 15z" />
  )],
  ["Security-first", "Input and output sanitized: XSS vectors, URL schemes, mXSS double-parse — adversarially tested.", (
    <path key="i" d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3zm-2.5 9l2 2 3.5-3.5" />
  )],
  ["Accessible", "WCAG 2.1 AA statement backed by an axe-core sweep of every surface, in CI.", (
    <path key="i" d="M12 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM4 8h16M12 8v5m0 0l-3.5 7M12 13l3.5 7" />
  )],
  ["19 plugins in the box", "Images, tables, links, embeds, find & replace, source view, code blocks, and more — all free.", (
    <path key="i" d="M10 4H5a1 1 0 00-1 1v5h2.5a2.5 2.5 0 010 5H4v5a1 1 0 001 1h5v-2.5a2.5 2.5 0 015 0V21h5a1 1 0 001-1v-5h-2.5a2.5 2.5 0 010-5H21V5a1 1 0 00-1-1h-5v2.5a2.5 2.5 0 01-5 0V4z" />
  )],
  ["Speaks your language", "Spanish, French, German, Arabic packs included; full RTL; bring-your-own locale.", (
    <path key="i" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.2 4-5.4 4-9s-1.5-6.8-4-9c-2.5 2.2-4 5.4-4 9s1.5 6.8 4 9zM3.5 9h17M3.5 15h17" />
  )],
  ["Framework-native", "Official React, Vue, and Angular wrappers — caret-stable controlled modes, proven live.", (
    <path key="i" d="M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5M3 16.5l9 5 9-5" />
  )],
];

const STACKS = [
  { name: "Plain JavaScript", pkg: "openeditor-text", note: "The zero-dependency engine — works anywhere" },
  { name: "React / Next.js", pkg: "openeditor-text-react", note: "Caret-safe controlled mode, SSR-friendly" },
  { name: "Vue 3", pkg: "openeditor-text-vue", note: "v-model binding out of the box" },
  { name: "Angular 17+", pkg: "openeditor-text-angular", note: "ngModel + standalone component" },
];

const USAGE = `import { OpenEditor } from 'openeditor-text';

const editor = new OpenEditor('#editor', {
  placeholder: 'Write something…',
});`;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--brand)" }}>
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-5">
      {/* Hero — centered copy, then the live editor showcased below */}
      <section className="relative py-16 md:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-120 w-225 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--brand) 14%, transparent), transparent)" }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-5 flex flex-wrap justify-center gap-2 text-xs font-medium">
            {["v1.1.0 on npm", "MIT license", "Zero dependencies"].map((b) => (
              <span key={b} className="rounded-full border px-3 py-1" style={{ borderColor: "var(--edge)", background: "var(--paper-raised)", color: "var(--ink-muted)" }}>
                {b}
              </span>
            ))}
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl" style={{ textWrap: "balance" }}>
            The rich text editor with{" "}
            <span style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-hover))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              nothing to hide
            </span>{" "}
            in your bundle.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            Pure JavaScript. Zero dependencies. No license key. Smaller, safer, and more
            accessible than the editors you&apos;re comparing it against — with the
            measurements to prove every word of that sentence.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link href="/demo" className="btn-primary rounded-xl px-6 py-3 font-medium">
              Try the live demo
            </Link>
            <Link
              href="/docs"
              className="card card-hover rounded-xl border px-6 py-3 font-medium"
            >
              Read the docs
            </Link>
            <code className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--edge)", background: "var(--paper-raised)" }}>
              npm i openeditor-text
            </code>
          </div>
        </div>
        <div className="relative mx-auto mt-14 max-w-4xl">
          <HeroEditorLoader />
        </div>
      </section>

      {/* Stats band */}
      <section className="grid gap-px overflow-hidden rounded-2xl border md:grid-cols-4" style={{ borderColor: "var(--edge)", background: "var(--edge)", boxShadow: "var(--shadow-soft)" }}>
        {CLAIMS.map((c) => (
          <div key={c.label} className="p-6" style={{ background: "var(--paper)" }}>
            <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--brand)" }}>{c.n}</div>
            <div className="mt-1 font-medium">{c.label}</div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>{c.d}</p>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="py-20">
        <Eyebrow>Features</Eyebrow>
        <h2 className="text-3xl font-bold tracking-tight">Everything in the box, nothing behind a key</h2>
        <p className="mt-2 max-w-prose" style={{ color: "var(--ink-muted)" }}>
          Built for developers who are tired of &ldquo;free&rdquo; editors with paid unlock screens.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, d, icon]) => (
            <div key={t} className="card card-hover rounded-xl border p-5">
              <span
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ background: "color-mix(in oklab, var(--brand) 12%, transparent)", color: "var(--brand)" }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {icon}
                </svg>
              </span>
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm" style={{ color: "var(--ink-muted)" }}>
          Skeptical? Good. <Link href="/compare" className="underline underline-offset-4" style={{ color: "var(--brand)" }}>See the feature-by-feature comparison</Link> — every row links to live proof.
        </p>
      </section>

      {/* Getting started */}
      <section className="py-4">
        <Eyebrow>Getting started</Eyebrow>
        <h2 className="text-3xl font-bold tracking-tight">Up and running in seconds</h2>
        <p className="mt-2 max-w-prose" style={{ color: "var(--ink-muted)" }}>
          Install from npm and add two lines of code. The toolbar, status bar, and all
          styling are injected by the editor itself.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="card overflow-hidden rounded-xl border" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: "var(--edge)", background: "var(--paper-raised)" }}>
              <span aria-hidden className="flex gap-1.5">
                {["#f87171", "#fbbf24", "#34d399"].map((c) => (
                  <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c, opacity: 0.8 }} />
                ))}
              </span>
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>Terminal</span>
            </div>
            <pre className="overflow-x-auto p-5 text-sm leading-relaxed"><code><span style={{ color: "var(--ink-muted)" }}>$</span> npm i openeditor-text</code></pre>
          </div>
          <div className="card overflow-hidden rounded-xl border" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="flex items-center border-b px-4 py-2.5 text-xs" style={{ borderColor: "var(--edge)", background: "var(--paper-raised)", color: "var(--ink-muted)" }}>
              app.js
            </div>
            <pre className="overflow-x-auto p-5 text-sm leading-relaxed"><code>{USAGE}</code></pre>
          </div>
        </div>
        <p className="mt-6 text-sm" style={{ color: "var(--ink-muted)" }}>
          Prefer a one-liner? <code className="rounded border px-1.5 py-0.5" style={{ borderColor: "var(--edge)", background: "var(--paper-raised)" }}>npx openeditors add text</code> auto-detects
          your framework. <Link href="/docs/CONFIG" className="underline underline-offset-4" style={{ color: "var(--brand)" }}>Full configuration reference →</Link>
        </p>
      </section>

      {/* Integrations */}
      <section className="py-20">
        <Eyebrow>Integrations</Eyebrow>
        <h2 className="text-3xl font-bold tracking-tight">Works with your stack</h2>
        <p className="mt-2 max-w-prose" style={{ color: "var(--ink-muted)" }}>
          Official wrappers with the same contract everywhere: reactive <code>value</code>, <code>theme</code>, and <code>readOnly</code>; caret-stable controlled modes.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STACKS.map((s) => (
            <div key={s.pkg} className="card card-hover rounded-xl border p-5">
              <h3 className="font-semibold">{s.name}</h3>
              <code className="mt-2 inline-block rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--edge)", background: "var(--paper-raised)", color: "var(--brand)" }}>
                {s.pkg}
              </code>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section
        className="relative overflow-hidden rounded-2xl border px-8 py-14 text-center"
        style={{ borderColor: "var(--edge)", boxShadow: "var(--shadow-soft)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(600px circle at 50% 0%, color-mix(in oklab, var(--brand) 16%, transparent), transparent)" }}
        />
        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight" style={{ textWrap: "balance" }}>
            Nothing to unlock. Nothing phoning home.
          </h2>
          <p className="mx-auto mt-3 max-w-xl" style={{ color: "var(--ink-muted)" }}>
            Every feature on this site is live in the demo right now — no trial,
            no key, no sales call.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/demo" className="btn-primary rounded-xl px-6 py-3 font-medium">
              Open the live demo
            </Link>
            <Link href="/compare" className="card card-hover rounded-xl border px-6 py-3 font-medium">
              Compare with Jodit &amp; CKEditor
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
