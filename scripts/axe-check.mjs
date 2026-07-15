/**
 * 21.6 — the site's own accessibility gate: axe (WCAG A/AA) on every route.
 * An editor selling accessibility cannot have an inaccessible website.
 * Run against a production build: `next build && node scripts/axe-check.mjs`
 */
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { spawn } from 'child_process';

const server = spawn('npx', ['next', 'start', '-p', '4401'], { stdio: 'pipe' });
await new Promise((res) => { server.stdout.on('data', (d) => { if (String(d).includes('4401')) setTimeout(res, 800); }); setTimeout(res, 15000); });

const ROUTES = ['/', '/playground', '/docs', '/docs/CONFIG', '/compare'];
const browser = await chromium.launch();
let failed = false;
try {
  // axe-core/playwright requires a page from an explicit context — a bare
  // browser.newPage() throws "Please use browser.newContext()".
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const route of ROUTES) {
    await page.goto(`http://localhost:4401${route}`);
    await page.waitForTimeout(1200); // let client editors mount
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    console.log(`[axe] ${route}: ${critical.length === 0 ? 'OK' : critical.length + ' CRITICAL/SERIOUS'}`);
    for (const v of critical) {
      failed = true;
      console.error(`  [${v.impact}] ${v.id}: ${v.description} → ${v.nodes.slice(0, 2).map((n) => n.target).join(' | ')}`);
    }
  }
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
