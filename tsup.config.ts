import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  // Not published: dist/cli.js.map is ~1.8x the bundle and embeds every
  // source verbatim, including the ~33 KB skill blob. Nothing consuming a
  // CLI reads it.
  sourcemap: false,
  clean: true,
  dts: false,
  outDir: "dist",
  banner: {
    js: "#!/usr/bin/env node",
  },
});
