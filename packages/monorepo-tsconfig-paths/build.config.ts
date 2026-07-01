import process from "node:process";
import { outputEntryBuilder } from "@unimolecule/utils/node";
import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    format: ["esm", "cjs"],
    platform: "node",
    dts: true,
    tsconfig: "./tsconfig.json",
    watch: process.env.NODE_ENV === "development",
    shims: true,
  },
  {
    entry: outputEntryBuilder("./src/cli"),
    format: ["esm", "cjs"],
    platform: "node",
    dts: true,
    tsconfig: "./tsconfig.json",
    outDir: "dist/cli",
    watch: process.env.NODE_ENV === "development",
    shims: true,
    clean: false,
  },
  {
    entry: outputEntryBuilder("./src/core"),
    format: ["esm", "cjs"],
    platform: "node",
    dts: true,
    tsconfig: "./tsconfig.json",
    outDir: "dist/core",
    watch: process.env.NODE_ENV === "development",
    shims: true,
    clean: false,
  },
  {
    entry: outputEntryBuilder("./src/node"),
    format: ["esm", "cjs"],
    platform: "node",
    dts: true,
    tsconfig: "./tsconfig.json",
    outDir: "dist/node",
    watch: process.env.NODE_ENV === "development",
    shims: true,
    clean: false,
  },
]);
