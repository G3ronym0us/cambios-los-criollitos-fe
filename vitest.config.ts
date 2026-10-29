import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Tests puros de lógica: no se procesa CSS/PostCSS (Tailwind v4) para evitar
  // cargar postcss.config.mjs, que no aplica en el entorno de test.
  css: { postcss: { plugins: [] } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: true,
  },
});
