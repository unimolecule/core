import process from "node:process";
import { defineConfig } from "tsdown";
import { outputEntryBuilder } from "./src/node/output-entry-builder";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    format: ["esm", "cjs"],
    platform: "node",
    dts: true,
    tsconfig: "./tsconfig.basic.json",
    watch: process.env.NODE_ENV === "development",
  },
  {
    entry: outputEntryBuilder("./src/node"),
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
    entry: outputEntryBuilder("./src/web"),
    format: ["esm", "cjs"],
    platform: "browser",
    dts: true,
    tsconfig: "./tsconfig.web.json",
    outDir: "dist/web",
    watch: process.env.NODE_ENV === "development",
    clean: false,
  },
]);
