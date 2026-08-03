import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Vitest's own per-test ceiling, distinct from testing-library's
    // asyncUtilTimeout in src/__tests__/setup.ts. It MUST stay above that
    // value: if a test is killed before waitFor gives up, the failure reads
    // "Test timed out in 5000ms" instead of the actual assertion, which is
    // how two post-merge reds got misdiagnosed as a waitFor problem.
    // CI runners are 2-core running 150+ files in parallel workers.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      // Money-critical ops scripts keep colocated unit tests (pure-planner logic
      // that decides which prod rows get deleted). Scoped to scripts/ops so the
      // gate stays green and unrelated script trees aren't pulled in.
      'scripts/ops/**/*.{test,spec}.mjs',
    ],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
