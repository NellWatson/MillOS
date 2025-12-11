import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc'; // SWC is 20x faster than Babel

// Plugin to serve static v0.10 build during development
function serveStaticVersions(): Plugin {
  return {
    name: 'serve-static-versions',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/v0.10')) {
          const urlPath = req.url.replace(/\?.*$/, ''); // Remove query string
          let filePath = path.join(__dirname, 'public', urlPath);

          // Serve index.html for directory requests
          if (urlPath === '/v0.10' || urlPath === '/v0.10/') {
            filePath = path.join(__dirname, 'public', 'v0.10', 'index.html');
          }

          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            const contentTypes: Record<string, string> = {
              '.html': 'text/html',
              '.js': 'application/javascript',
              '.css': 'text/css',
              '.json': 'application/json',
            };
            res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
            res.end(fs.readFileSync(filePath));
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
    loadEnv(mode, '.', '');
    // Support versioned deployments: VERSION=v0.10 -> base=/v0.10/
    const version = process.env.VERSION;
    const basePath = version ? `/${version}/` : '/';
    return {
      base: basePath,
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: {
          overlay: false, // Disable error overlay (reduces rendering overhead)
        },
        watch: {
          usePolling: false,
          interval: 1000, // Check for changes less frequently
          ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
        },
      },
      plugins: [serveStaticVersions(), react()],
      // SECURITY: API keys should NOT be embedded in client bundles
      // Use a backend proxy (serverless function) instead
      // define: {
      //   'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      //   'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      // },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // Build optimization for better bundle splitting and caching
      build: {
        target: 'es2020',
        minify: 'esbuild', // esbuild is faster, terser for smaller bundles
        sourcemap: false, // Disable for production (saves ~30% bundle size)
        rollupOptions: {
          output: {
            // Manual chunks for better caching and parallel loading
            manualChunks: {
              'three-core': ['three'],
              'three-fiber': ['@react-three/fiber', '@react-three/drei'],
              'three-postprocessing': ['@react-three/postprocessing', 'postprocessing'],
              'ui-vendor': ['framer-motion'],
              'charts': ['recharts'],
            },
          },
        },
        chunkSizeWarningLimit: 1500, // Increase warning limit for 3D app
      },
      optimizeDeps: {
        // Pre-bundle heavy dependencies for faster dev startup
        include: ['three', '@react-three/fiber', '@react-three/drei', 'framer-motion'],
        // Exclude troika to prevent ES6 class transpilation issues
        exclude: ['troika-three-text'],
        esbuildOptions: {
          target: 'esnext',
          supported: {
            'top-level-await': true,
          },
        },
      },
      esbuild: {
        // Preserve ES6 classes in all files
        target: 'esnext',
      },
    };
});
