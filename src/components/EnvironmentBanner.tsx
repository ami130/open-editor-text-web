/**
 * EnvironmentBanner — says, unmissably, WHICH backend this admin panel edits.
 *
 * ─── WHY ────────────────────────────────────────────────────────────────────
 * Every wrong-environment mistake on this project was invisible until something
 * silently failed to work:
 *
 *   • a package built with every feature, on the LOCAL backend, then expected
 *     to appear in the deployed demo — it never existed there
 *   • a licence signed by `oe-dev-1` pasted into a production demo, quietly
 *     resolving to the free tier because a token cannot verify against a
 *     bundle carrying a different key
 *
 * Neither produced an error. The admin panel looked identical either way, so
 * there was nothing to notice. This makes the environment loud instead.
 *
 * ─── WHAT IT SHOWS ──────────────────────────────────────────────────────────
 * The backend's own answer from /health: its environment name, its licence
 * `kid`, and the host. `kid` is the honest identifier — a name is a label
 * someone can mis-set, whereas the kid is the key licences are actually SIGNED
 * with. If two environments ever report the same kid they are not isolated,
 * whatever their names say.
 *
 * Rendered only when the backend is NOT production, so the common case stays
 * quiet — a banner that is always on is wallpaper. The one exception is an
 * UNREACHABLE backend, which is shown loudly: an admin panel that cannot see
 * its backend will fail every action, and saying so beats a wall of errors.
 */

interface EnvironmentInfo {
  name: string;
  isProduction: boolean;
  kid: string;
}

interface Props {
  environment: EnvironmentInfo | null;
  /** Backend origin, so two staging boxes are still distinguishable. */
  host: string;
  /** True when /health could not be reached at all. */
  unreachable?: boolean;
}

export default function EnvironmentBanner({ environment, host, unreachable }: Props) {
  if (unreachable) {
    return (
      <div
        role="alert"
        className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-4 py-2.5 text-sm"
        style={{ background: "#b3261e", color: "#fff" }}
      >
        <strong>Backend unreachable</strong>
        <span style={{ opacity: 0.9 }}>
          {host} did not answer. Every admin action on this page will fail.
        </span>
      </div>
    );
  }

  /**
   * A backend that cannot identify itself is NOT the same as production.
   *
   * The first draft treated `environment == null` as "nothing to say" and
   * rendered silence — so an older backend, or one whose /health lacks the
   * field, looked exactly like production. That is the failure this component
   * exists to prevent, reintroduced by its own default. Caught by pointing the
   * admin at the real production backend before the field was deployed there:
   * the banner correctly showed nothing, for entirely the wrong reason.
   *
   * Say so instead, quietly — this is a "cannot confirm", not an alarm.
   */
  if (!environment) {
    return (
      <div
        role="status"
        className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-4 py-2.5 text-sm"
        style={{ background: "var(--paper-raised)", border: "1px solid var(--edge)", color: "var(--ink-muted)" }}
      >
        <strong style={{ color: "var(--ink)" }}>Unidentified backend</strong>
        <span>
          {host} did not report an environment, so this panel cannot confirm
          whether it is production. Deploy a backend new enough to report one.
        </span>
      </div>
    );
  }

  // Production is the expected case — stay silent so the banner keeps meaning
  // something when it does appear.
  if (environment.isProduction) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-4 py-2.5 text-sm"
      style={{ background: "#8a6d00", color: "#fff" }}
    >
      <strong className="uppercase tracking-wide">
        {environment.name} environment
      </strong>
      <span style={{ opacity: 0.9 }}>
        Changes here do <strong>not</strong> affect production.
      </span>
      <span className="ml-auto font-mono text-xs" style={{ opacity: 0.85 }}>
        {host}
        {environment.kid ? ` · signing key ${environment.kid}` : " · NO SIGNING KEY"}
      </span>
    </div>
  );
}
