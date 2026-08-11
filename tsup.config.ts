import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "resources/index": "src/resources/index.ts",
    "types/index": "src/types/index.ts",
    errors: "src/errors.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node20",
  minify: false,
  splitting: false,
  bundle: true,
  outExtension({ format }) {
    return format === "esm"
      ? { js: ".mjs", dts: ".d.mts" }
      : { js: ".cjs", dts: ".d.cts" };
  },
});
