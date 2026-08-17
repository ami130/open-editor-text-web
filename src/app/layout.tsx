import type { Metadata } from "next";
import Link from "next/link";
import NavLinks from "@/components/NavLinks";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Editor — the zero-dependency rich text editor",
  description:
    "A modern WYSIWYG editor in pure JavaScript. No license key, no telemetry, no dependencies. Smaller than Jodit and CKEditor, security-first, WCAG-conformant.",
};

const nav = [
  { href: "/demo", label: "Live demo" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/compare", label: "Compare" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Replays the saved theme before first paint so there is no flash;
            absent/invalid values fall through to the OS preference. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ borderColor: "var(--edge)", background: "color-mix(in oklab, var(--paper) 85%, transparent)" }}>
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span aria-hidden className="inline-block h-5 w-5 rounded-md" style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-hover))" }} />
              Open Editor
            </Link>
            <nav className="flex items-center gap-6">
              <NavLinks items={nav} />
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <a
                  href="https://www.npmjs.com/package/openeditor-text"
                  className="btn-primary rounded-lg px-3 py-1.5 text-sm font-medium"
                >
                  npm
                </a>
              </div>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-24 border-t py-10 text-sm" style={{ borderColor: "var(--edge)", color: "var(--ink-muted)" }}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5">
            <span>© {new Date().getFullYear()} Open Editor · MIT licensed · no license keys, ever (free tier)</span>
            <span className="flex gap-5">
              <Link href="/pricing" className="hover:underline">Pricing</Link>
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
