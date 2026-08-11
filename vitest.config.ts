import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/types/**/*", "src/resources/index.ts"],
      reporter: ["text", "json", "html"],
      lines: 90,
      functions: 80,
      branches: 80,
      statements: 90,
    },
  },
});
