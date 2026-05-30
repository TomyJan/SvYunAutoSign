import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    restoreMocks: true,
    clearMocks: true,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
