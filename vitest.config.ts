import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Coverage thresholds per the node-hudu/node-autotask line: lines/functions/
// branches/statements = 90/90/80/90 (node-hudu's 97/94/83/97 remains the
// stretch target). Enforced via `npm run coverage` and in CI.
export default defineConfig({
  // Issue #11: the sources import the errors module by the package's own name
  // (see tsup.config.ts `external`), so in the test graph that self-reference must
  // resolve to the SAME module instance as the tests' relative `../src/errors`
  // imports — otherwise cross-copy `instanceof` assertions see two classes.
  resolve: {
    alias: {
      'node-kimai/errors': fileURLToPath(new URL('./src/errors.ts', import.meta.url)),
    },
  },
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
