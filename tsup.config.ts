import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts", "src/index.ts", "src/mcp/server.ts"],
  format: ["esm"],
  target: "es2022",
  splitting: true,
  clean: true,
  dts: true,
  sourcemap: true,
  external: ["zod"],
  banner: ({ format }) => {
    if (format === "esm") {
      return { js: "" };
    }
    return {};
  },
});
