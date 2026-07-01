import process from "node:process";
import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    format: ["esm", "cjs"],
    platform: "node",
    dts: true,
    tsconfig: "./tsconfig.json",
    watch: process.env.NODE_ENV === "development",
  },
  {
    entry: ["./src/http/index.ts"],
    format: ["esm", "cjs"],
    platform: "node",
    dts: true,
    tsconfig: "./tsconfig.json",
    outDir: "dist/http",
    unbundle: true,
    watch: process.env.NODE_ENV === "development",
    clean: false,
  },
]);
