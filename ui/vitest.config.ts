import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createRequire } from 'module';
import { existsSync } from 'fs';

const require = createRequire(import.meta.url);

// Resolve React from the package that @testing-library/react will use.
// In worktree setups, root node_modules may have a separate React copy.
// We must ensure a single React instance across test infra and source.
const rootReact = path.resolve(__dirname, '../node_modules/.pnpm/react@19.2.4/node_modules/react');
const resolvedReact = existsSync(rootReact)
  ? rootReact
  : path.dirname(require.resolve('react/package.json'));
const rootReactDom = path.resolve(__dirname, '../node_modules/.pnpm/react-dom@19.2.4_react@19.2.4/node_modules/react-dom');
const resolvedReactDom = existsSync(rootReactDom)
  ? rootReactDom
  : path.dirname(require.resolve('react-dom/package.json'));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', '.claude/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': resolvedReact,
      'react-dom': resolvedReactDom,
    },
  },
});
