# open-editor-web

The public web platform for **Open Editor** — landing page, live playground,
documentation, and comparison page. Fully separate from the editor monorepo
(Phase 21 of the editor's plan); later phases add the admin panel + license
service (Phase 23) and commerce (Phase 24) to this same project.

Built with Next.js (App Router, TypeScript, Tailwind v4), rendered fully
static — every route is prerendered, no server code in the public site.

## Routes

| Route | What it is |
|---|---|
| `/` | Landing — live hero editor, claims, feature grid |
| `/playground` | The centerpiece: 19 toggleable plugins, theme/locale/direction switches, and a **config reflector** that emits copy-paste code for the exact current setup |
| `/docs` + `/docs/[slug]` | 8 documentation pages synced from the editor repo (SSG) |
| `/compare` | Honest feature/size/license comparison vs CKEditor and Jodit, with "see it live" proof links |

## Development

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

## Gates (all must pass before a deploy)

```bash
pnpm build                    # static build — must complete with all routes prerendered
node scripts/axe-check.mjs    # accessibility gate: axe WCAG 2.0 A/AA on 5 routes,
                              # fails on any critical/serious violation (needs a prior build)
```

CI runs both (see `.github/workflows/ci.yml`).

## How the editor gets here (important)

- **Engine + React wrapper:** installed from the public npm registry under the
  final names — `openeditor-text@^1.1.0` and `openeditor-text-react@^1.1.0`
  (published 2026-07-15; the earlier `@open-editor-hq/core` is deprecated with
  a pointer). The site dogfoods exactly what `npx openeditors add text`
  installs for users.

## Docs syncing

`scripts/sync-docs.mjs` copies the 8 markdown files from the editor repo
(`../open-editor`) into `content/docs/`. The copies are committed — the editor
repo stays the single source of truth; re-run the script after editing docs
there.

```bash
node scripts/sync-docs.mjs
```

## Decisions log

- **2026-07-14** — one fresh Next.js project for ALL web phases (21/23/24); no
  separate backend framework. Public site is static; server features arrive
  with Phase 23 behind auth.
- **2026-07-14** — live editor on the landing + playground uses the real
  packages (registry core + packed wrapper tarball), not a copy of source —
  the site dogfoods exactly what users install.
- **2026-07-15** — brand/package naming pivoted to the `openeditors` family
  (see editor repo README, Phase 25). Site copy adopts it at migration.

## Deploy

Static-first: any Vercel-class host works. Decisions pending: GitHub repo home,
hosting platform, domain.
# open-editor-text-web
