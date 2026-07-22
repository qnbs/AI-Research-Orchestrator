import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// Repository name for GitHub Pages deployment
const REPO_NAME = 'AI-Research-Orchestrator';

// Vendor chunk assignment by package name. Rolldown (Vite 8's default bundler) only
// supports the function form of rollupOptions.output.manualChunks, not the object-shorthand
// form Rollup itself accepts - this replicates the same package -> chunk mapping.
const VENDOR_CHUNKS: Record<string, string> = {
  react: 'vendor-react',
  'react-dom': 'vendor-react',
  'react-redux': 'vendor-redux',
  '@reduxjs/toolkit': 'vendor-redux',
  recharts: 'vendor-charts',
  'framer-motion': 'vendor-motion',
  'lucide-react': 'vendor-ui',
  cmdk: 'vendor-ui',
};

function manualChunks(id: string): string | undefined {
  const marker = 'node_modules/';
  const idx = id.lastIndexOf(marker);
  if (idx === -1) return undefined;
  const rest = id.slice(idx + marker.length);
  const segments = rest.split('/');
  const pkg = segments[0].startsWith('@') ? `${segments[0]}/${segments[1]}` : segments[0];
  return VENDOR_CHUNKS[pkg];
}

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
          manualChunks,
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
