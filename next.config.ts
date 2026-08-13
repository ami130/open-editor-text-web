import type { NextConfig } from "next";

/**
 * Security headers for the admin panel + public storefront (Phase G).
 *
 * CSP notes:
 *  - `default-src 'self'` — everything same-origin by default.
 *  - `style-src` allows 'unsafe-inline': the app styles heavily via inline
 *    `style={{...}}` + Tailwind's injected styles.
 *  - `script-src` allows 'unsafe-inline': Next.js emits inline bootstrap/
 *    hydration <script> blocks. Without a nonce pipeline they'd be BLOCKED by a
 *    strict `'self'`, breaking client interactivity. We deliberately choose a
 *    WORKING CSP over a strict-but-broken one. UPGRADE PATH: generate a per-
 *    request nonce in proxy.ts and switch this to `'self' 'nonce-<n>'
 *    'strict-dynamic'` — documented in DEPLOY.md. Every other directive stays
 *    locked down (no object/frame-ancestors/base hijack, no third-party src).
 *  - `img-src` allows data: for inline SVG/data-URI icons.
 *  - `connect-src` — the browser calls this app's own /api/* (the BFF) AND, for
 *    EMBEDDED Stripe Checkout, Stripe's API/JS hosts (Stripe.js runs in the
 *    browser and talks to api.stripe.com).
 *  - `script-src`/`frame-src` allow Stripe's JS + the iframed card fields:
 *    embedded checkout loads js.stripe.com and renders the payment form inside
 *    a *.stripe.com iframe ON THIS PAGE (no redirect to checkout.stripe.com).
 *  - `frame-ancestors 'none'` — this app is never embedded (clickjacking guard).
 *    (Distinct from frame-src, which governs what WE may embed — i.e. Stripe.)
 */
// Next.js DEV mode (Turbopack/React refresh) requires eval() for hot-reload +
// debugging; production never does. So we add 'unsafe-eval' to script-src ONLY
// in development. Production stays strict (no eval).
const isDev = process.env.NODE_ENV !== "production";
// Stripe.js is served from js.stripe.com; embedded checkout iframes render the
// card fields from js.stripe.com / *.stripe.com; Stripe.js calls api.stripe.com.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
  : "script-src 'self' 'unsafe-inline' https://js.stripe.com";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  scriptSrc,
  "frame-src https://js.stripe.com https://*.stripe.com",
  "connect-src 'self' https://api.stripe.com https://js.stripe.com",
  "font-src 'self' data:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS: only meaningful over HTTPS; harmless on http (browsers ignore it there).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  /**
   * Standalone output produces a self-contained .next/standalone/server.js for
   * a slim Docker image (Phase G deploy). It is what the Dockerfile COPYs.
   *
   * ⚠️ IT MUST NOT BE SET ON VERCEL. Vercel runs Next on its own platform and
   * expects the normal build; with `standalone` its detection falls through to
   * "No Output Directory named 'dist' found" — an error that points nowhere
   * near the cause and cost real time to diagnose.
   *
   * Vercel sets VERCEL=1 in every build, so this stays off there and on
   * everywhere else. Docker and Railway keep the slim image; Vercel builds
   * normally. Neither deployment target needs a config change.
   */
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
