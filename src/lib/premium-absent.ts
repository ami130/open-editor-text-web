/**
 * Stands in for the `@openeditor-premium/*` packages, which are private and
 * deliberately unpublished.
 *
 * The v1 engine (used by /playground and the hero) probes for its premium
 * plugins with dynamic `import()` calls already wrapped in try/catch — see
 * `entitlements/premium-plugins.js`. At RUNTIME an absent package is therefore
 * a non-event: the catch fires and the editor loads without those plugins,
 * which is exactly right for a public site that has no premium licence.
 *
 * The bundler is the problem, not the runtime. Turbopack resolves dynamic
 * imports statically and fails the build on a specifier it cannot find, even
 * one whose failure is handled. Aliasing those specifiers here gives it
 * something real to resolve; the named exports it looks for
 * (`rawExportPdfSpec` / `rawExportDocxSpec`) are absent, so the destructure
 * still throws and the catch still runs — the intended path.
 *
 * ⚠️ This does NOT stub out premium for v2. The v2 loader never imports these
 * specifiers at all: its premium code arrives inside the engine bundle the
 * delivery API serves, gated by the licence. This file exists solely so a v1
 * consumer can be bundled outside the monorepo.
 */
export {};
