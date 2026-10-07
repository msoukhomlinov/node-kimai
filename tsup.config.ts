import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "resources/index": "src/resources/index.ts",
    "types/index": "src/types/index.ts",
    errors: "src/errors.ts",
    capabilities: "src/capabilities.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node24",
  minify: false,
  splitting: false,
  bundle: true,
  outExtension({ format }) {
    return format === "esm"
      ? { js: ".js", dts: ".d.ts" }
      : { js: ".cjs", dts: ".d.cts" };
  },
});
