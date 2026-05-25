import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
  },
  resolve: {
    alias: {
      '@js': '/js',
      '@css': '/css',
      '@screens': '/js/screens',
    },
  },
});
