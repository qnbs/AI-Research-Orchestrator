import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  resolve: {
    alias: {
      // FIX: Use path.resolve without __dirname, which is not available in ESM modules.
      '@': path.resolve('src'),
    },
  },
});