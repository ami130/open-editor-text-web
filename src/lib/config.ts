/**
 * config.ts — server-side config for the admin panel's BFF layer.
 *
 * The Next app never exposes the backend URL or tokens to the browser: it talks
 * to the backend (open-editor-backend) server-side, and the browser only ever
 * sees Next's OWN same-origin route handlers + an httpOnly session cookie.
 */
import 'server-only';

/** Base URL of the open-editor-backend API (server-only; not a NEXT_PUBLIC_ var). */
export const BACKEND_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:8787').replace(/\/+$/, '');

/** Name of Next's own session cookie (holds the backend tokens, httpOnly). */
export const SESSION_COOKIE = 'oe_session';

/** Session cookie lifetime — matches the backend refresh TTL (7d). */
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Name of the backend's refresh cookie (mirror of AUTH_REFRESH_COOKIE on the
 *  backend, default 'oe_refresh'). Used to pick the rotated refresh token out of
 *  the backend's Set-Cookie response reliably. */
export const REFRESH_COOKIE_NAME = (process.env.AUTH_REFRESH_COOKIE || 'oe_refresh').trim();

/** Shared secret proving this (the BFF/Next server) to the backend on the
 *  server-to-server /auth/refresh call. MUST match BFF_SHARED_SECRET on the
 *  backend. Server-only. Empty in dev is fine (backend falls back to its
 *  origin-allowlist behaviour). */
export const BFF_SHARED_SECRET = (process.env.BFF_SHARED_SECRET || '').trim();

/** Phase 4 — Next's own httpOnly cookie for the CUSTOMER portal session (holds
 *  the backend customer-session token). Separate from the admin SESSION_COOKIE
 *  so the two never collide. */
export const CUSTOMER_SESSION_COOKIE = 'oe_customer_session';

/** Customer portal session lifetime — matches the backend CUSTOMER_SESSION_TTL
 *  (short; re-login via a fresh magic link is cheap). Default 30 min. */
export const CUSTOMER_SESSION_MAX_AGE_MS = 30 * 60 * 1000;
