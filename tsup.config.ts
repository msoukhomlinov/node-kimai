import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "resources/index": "src/resources/index.ts",
    "types/index": "src/types/index.ts",
    errors: "src/errors.ts",
    capabilities: "src/capabilities.ts",
    "operations/index": "src/operations/index.ts",
    untrusted: "src/untrusted.ts",
    "mcp/index": "src/mcp/index.ts",
  },
  format: ["esm", "cjs"],
  // One ApiError identity across all entries (issue #11): every entry imports the errors
  // module by the package's own name and we keep that specifier external, so each emitted
  // bundle re-exports the single physical dist/errors.{js,cjs} at runtime instead of
  // inlining its own copy (splitting:false would otherwise give each entry its own class).
  external: ["node-kimai/errors"],
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
