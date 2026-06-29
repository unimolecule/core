import process from "node:process";
import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    format: ["esm", "cjs"],
    platform: "node",
    dts: true,
    tsconfig: "./tsconfig.basic.json",
    watch: process.env.NODE_ENV === "development",
    shims: true,
  },
  {
    entry: ["./src/node/index.ts"],
    format: ["esm", "cjs"],
    platform: "node",
    dts: true,
    tsconfig: "./tsconfig.node.json",
    outDir: "dist/node",
    watch: process.env.NODE_ENV === "development",
    shims: true,
    clean: false,
  },
  {
    entry: ["./src/web/index.ts"],
    format: ["esm", "cjs"],
    platform: "browser",
    dts: true,
    tsconfig: "./tsconfig.web.json",
    outDir: "dist/web",
    watch: process.env.NODE_ENV === "development",
    clean: false,
  },
]);
