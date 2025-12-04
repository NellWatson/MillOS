import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react() as any],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'scada-proxy'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/scada/**/*.ts'],
      exclude: [
        'src/scada/**/*.test.ts',
        'src/scada/**/*.bench.ts',
        'src/scada/index.ts'
      ]
    },
    benchmark: {
      include: ['src/**/*.bench.ts'],
      reporters: ['default'],
      outputJson: 'benchmark-results.json'
    },
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});
