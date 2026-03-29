import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// @testing-library/react resolves from root node_modules.
// Force ALL React imports to use the same copy to prevent "Invalid hook call" errors.
const rootReact = path.resolve(__dirname, '../node_modules/react');
const rootReactDom = path.resolve(__dirname, '../node_modules/react-dom');

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
      'react': rootReact,
      'react-dom': rootReactDom,
    },
  },
});
