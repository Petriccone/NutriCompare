import { defineConfig } from 'vitest/config';

// Dedicated vitest config — intentionally separate from vite.config.ts
// so that the dev server and test runner are independent.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['services/scoring/**/*.test.ts', 'services/**/*.test.ts'],
    globals: false,
  },
});
