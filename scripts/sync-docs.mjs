/**
 * sync-docs.mjs — copy the editor repo's markdown docs into content/docs.
 * The editor repo is the single source of truth; the copies here are
 * COMMITTED so CI/hosting builds never depend on a sibling checkout.
 * Re-run whenever the editor docs change: `node scripts/sync-docs.mjs`
 */
import { copyFileSync, existsSync, mkdirSync } from 'fs';

const SRC = '../open-editor/docs';
const DOCS = ['CONFIG', 'THEMING', 'THEME-TOKENS', 'PLUGINS', 'ACCESSIBILITY', 'ERROR-REPORTING'];
const EXTRA = [['../open-editor/SECURITY.md', 'SECURITY'], ['../open-editor/CHANGELOG.md', 'CHANGELOG']];

if (!existsSync(SRC)) {
  console.error('editor repo not found at ../open-editor — using committed copies');
  process.exit(0);
}
mkdirSync('content/docs', { recursive: true });
for (const d of DOCS) copyFileSync(`${SRC}/${d}.md`, `content/docs/${d}.md`);
for (const [from, name] of EXTRA) copyFileSync(from, `content/docs/${name}.md`);
console.log('synced', DOCS.length + EXTRA.length, 'docs from the editor repo');
