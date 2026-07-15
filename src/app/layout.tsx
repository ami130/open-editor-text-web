import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Editor — the zero-dependency rich text editor",
  description:
    "A modern WYSIWYG editor in pure JavaScript. No license key, no telemetry, no dependencies. Smaller than Jodit and CKEditor, security-first, WCAG-conformant.",
};

const nav = [
  { href: "/playground", label: "Playground" },
  { href: "/docs", label: "Docs" },
  { href: "/compare", label: "Compare" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ borderColor: "var(--edge)", background: "color-mix(in oklab, var(--paper) 85%, transparent)" }}>
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span aria-hidden className="inline-block h-5 w-5 rounded-md" style={{ background: "var(--brand)" }} />
              Open Editor
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="hover:underline underline-offset-4">
                  {n.label}
                </Link>
              ))}
              <a
                href="https://www.npmjs.com/package/@open-editor-hq/core"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                style={{ background: "var(--brand)" }}
              >
                npm
              </a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-24 border-t py-10 text-sm" style={{ borderColor: "var(--edge)", color: "var(--ink-muted)" }}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5">
            <span>© {new Date().getFullYear()} Open Editor · MIT licensed · no license keys, ever (free tier)</span>
            <span className="flex gap-5">
              <Link href="/docs/SECURITY" className="hover:underline">Security</Link>
              <Link href="/docs/ACCESSIBILITY" className="hover:underline">Accessibility</Link>
              <Link href="/docs/CHANGELOG" className="hover:underline">Changelog</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
