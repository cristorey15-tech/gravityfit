import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // Run the suite in a UTC+ zone: it's where date logic built on
    // toISOString() silently shifts local days back by one (week keys,
    // "today" counters). Keeps tests deterministic across machines.
    env: { TZ: 'Europe/Madrid' },
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
