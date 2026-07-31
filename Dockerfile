# open-editor-web — production image (multi-stage, Next.js standalone, pnpm).
#
# `output: "standalone"` (next.config.ts) emits a self-contained server bundle
# with a minimal node_modules, so the runtime image stays small. Runs non-root.
#
# The backend URL is a SERVER-ONLY runtime env (BACKEND_URL) read at request
# time by the BFF — NOT baked in — so nothing secret is embedded here.

# ---- build ----
FROM node:22-slim AS build
WORKDIR /app
# pnpm-managed. corepack activates the EXACT pnpm pinned in package.json's
# "packageManager" field (pnpm@9.x, matching the v9 lockfile) — deterministic,
# no interactive download prompt in CI.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack install && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# ---- runtime ----
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Standalone server + static assets + public dir.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER node

EXPOSE 3000
# Next standalone entrypoint. HOSTNAME=0.0.0.0 so it binds outside the container.
ENV HOSTNAME=0.0.0.0 PORT=3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
