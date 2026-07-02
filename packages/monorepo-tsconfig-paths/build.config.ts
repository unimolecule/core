import process from "node:process";
import { outputEntryBuilder } from "@unimolecule/utils/node/output-entry-builder";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: outputEntryBuilder("./src"),
  format: ["esm", "cjs"],
  platform: "node",
  dts: true,
  tsconfig: "./tsconfig.json",
  watch: process.env.NODE_ENV === "development",
  shims: true,
});
