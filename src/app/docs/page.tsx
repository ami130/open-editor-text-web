import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Docs — Open Editor" };

const DOCS = [
  ["CONFIG", "Configuration", "Every option, its type, default, and behavior — the full reference."],
  ["IMAGE-UPLOAD", "Image uploads", "Connect image upload to your own API & database — auth, server examples, the full setup."],
  ["THEMING", "Theming", "Light/dark/minimal/auto, CSS custom properties, runtime switching, CSP-safe injection."],
  ["THEME-TOKENS", "Theme tokens", "The complete token reference for building your own theme."],
  ["PLUGINS", "Plugin authoring", "Write, test, and publish a third-party plugin — with a fully verified worked example."],
  ["ACCESSIBILITY", "Accessibility", "The WCAG 2.1 AA conformance statement and what backs it."],
  ["SECURITY", "Security", "The sanitizer's threat model and hardening policy."],
  ["ERROR-REPORTING", "Error reporting", "Wiring the error event into Sentry-class tooling."],
  ["CHANGELOG", "Changelog", "Every release, honestly accounted."],
];

export default function DocsIndex() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
      <p className="mt-2 mb-8" style={{ color: "var(--ink-muted)" }}>
        Rendered from the same markdown that ships in the repository — never forked, never stale.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {DOCS.map(([slug, title, blurb]) => (
          <li key={slug}>
            <Link href={`/docs/${slug}`} className="card card-hover block h-full rounded-xl border p-5">
              <h2 className="font-semibold" style={{ color: "var(--brand)" }}>{title}</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>{blurb}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
