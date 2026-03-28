import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vitest/testing-library live in the worktree root node_modules
// App dependencies (swr, react-markdown, etc.) live in ui/node_modules (symlinked from main project)
// We must deduplicate React so only one instance is used — use the ROOT instance
// since @testing-library/react also resolves react from the root pnpm store
const rootNodeModules = path.resolve(__dirname, '../node_modules');
const rootReact = path.resolve(rootNodeModules, '.pnpm/react@19.2.4/node_modules/react');
const rootReactDom = path.resolve(rootNodeModules, '.pnpm/react-dom@19.2.4_react@19.2.4/node_modules/react-dom');

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Force all React imports to use the same instance as @testing-library/react
      'react': rootReact,
      'react-dom': rootReactDom,
      'react/jsx-runtime': path.resolve(rootReact, 'jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(rootReact, 'jsx-dev-runtime'),
    },
  },
  server: {
    fs: {
      allow: [rootNodeModules, path.resolve(__dirname, 'node_modules')],
    },
  },
});
