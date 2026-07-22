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
    /**
     * Slow jsdom render tests (ErrorBoundary, CheckpointResumeBanner) take ~3s standalone
     * and flake past the 5s default under parallel worker load. Assertions are unchanged —
     * this only adds headroom for loaded dev machines and shared CI runners.
     */
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      // lcov is required for SonarQube Cloud coverage import (sonar.javascript.lcov.reportPaths).
      reporter: ['text', 'json', 'html', 'json-summary', 'lcov'],
      /** Focus coverage on logic layers (store, services, hooks, lib). UI views are mostly covered by E2E. */
      include: [
        'src/store/**/*.{ts,tsx}',
        'src/services/**/*.ts',
        'src/hooks/**/*.{ts,tsx}',
        'src/lib/**/*.ts',
      ],
      exclude: ['node_modules/', 'src/test/', 'dist/', '**/*.{test,spec}.{ts,tsx}'],
      /** Phase 2 (2026-07): gate raised to 80% after export/chat/slice depth + eval harness. */
      thresholds: {
        lines: 80,
        statements: 80,
        branches: 55,
        functions: 55,
      },
    },
  },
});
