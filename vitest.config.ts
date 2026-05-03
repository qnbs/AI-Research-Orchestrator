import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/', 'src/test/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary'],
      /** Focus coverage on logic layers (store, services, hooks, lib). UI views are mostly covered by E2E. */
      include: [
        'src/store/**/*.{ts,tsx}',
        'src/services/**/*.ts',
        'src/hooks/**/*.{ts,tsx}',
        'src/lib/**/*.ts',
      ],
      exclude: ['node_modules/', 'src/test/', 'dist/', '**/*.{test,spec}.{ts,tsx}'],
      /** Baseline aligned with measured aggregate coverage on logic-layer includes (large services e.g. gemini keep totals ~30%). */
      thresholds: {
        lines: 30,
        statements: 30,
        branches: 20,
        functions: 27,
      },
    },
  },
});
