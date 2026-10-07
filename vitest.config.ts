import { defineConfig } from 'vitest/config';

// Coverage thresholds per the node-hudu/node-autotask line: lines/functions/
// branches/statements = 90/90/80/90 (node-hudu's 97/94/83/97 remains the
// stretch target). Enforced via `npm run coverage` and in CI.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types/**/*.ts', 'src/resources/index.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
});
