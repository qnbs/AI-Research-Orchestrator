import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// Repository name for GitHub Pages deployment
const REPO_NAME = 'AI-Research-Orchestrator';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';
  const enableBundleReport = env.ANALYZE === '1' || process.env.ANALYZE === '1';

  return {
    // Base path for GitHub Pages (https://username.github.io/REPO-NAME/)
    base: isProduction ? `/${REPO_NAME}/` : '/',

    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    plugins: [
      react(),
      ...(enableBundleReport
        ? [
            visualizer({
              filename: 'dist/stats.html',
              gzipSize: true,
              brotliSize: true,
              open: false,
              template: 'treemap',
            }),
          ]
        : []),
    ],

    // Remove API key from build - it's now handled securely via user input
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    build: {
      // Optimize for production
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
        },
      },

      // Code splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks
            'vendor-react': ['react', 'react-dom'],
            'vendor-redux': ['react-redux', '@reduxjs/toolkit'],
            'vendor-charts': ['recharts'],
            'vendor-motion': ['framer-motion'],
            'vendor-ui': ['lucide-react', 'cmdk'],
          },
          // Asset hashing for cache busting
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'chunks/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
        },
      },

      // Generate source maps for debugging (optional in production)
      sourcemap: !isProduction,

      // Soft budget: warn when individual chunks exceed 500 kB (P1-1)
      chunkSizeWarningLimit: 500,
    },

    // PWA and performance optimizations
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-redux',
        '@reduxjs/toolkit',
        'framer-motion',
        'recharts',
      ],
    },
  };
});
