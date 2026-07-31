import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    setupFiles: ['tests/setup.ts'],
    alias: {
      // `@/…` path alias (mirror of tsconfig paths, without the ESM-only plugin).
      '@/': `${r('./src/')}`,
      // `server-only` throws outside an RSC; alias to a no-op for unit tests.
      'server-only': r('./tests/stubs/server-only.ts'),
    },
  },
});
