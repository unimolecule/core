import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { outputEntryBuilder } from "../../src/node/output-entry-builder";

const tempDirs: string[] = [];

async function createTempDir() {
  const dir = await mkdtemp(join(tmpdir(), "utils-node-entry-"));
  tempDirs.push(dir);
  return dir;
}

async function writeSourceFile(root: string, path: string) {
  const absolutePath = join(root, path);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, "export {};\n");
}

describe("outputEntryBuilder", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((dir) => rm(dir, { force: true, recursive: true })),
    );
  });

  it("builds entries for every matching source file by default", async () => {
    const cwd = await createTempDir();
    await writeSourceFile(cwd, "src/index.ts");
    await writeSourceFile(cwd, "src/feature/index.ts");
    await writeSourceFile(cwd, "src/feature/request.ts");

    expect(outputEntryBuilder("./src", { cwd })).toEqual({
      "feature/index": "./src/feature/index.ts",
      "feature/request": "./src/feature/request.ts",
      index: "./src/index.ts",
    });
  });

  it("can build entries only from index source files", async () => {
    const cwd = await createTempDir();
    await writeSourceFile(cwd, "src/index.ts");
    await writeSourceFile(cwd, "src/feature/index.ts");
    await writeSourceFile(cwd, "src/feature/request.ts");

    expect(outputEntryBuilder("./src", { cwd, entries: "index" })).toEqual({
      "feature/index": "./src/feature/index.ts",
      index: "./src/index.ts",
    });
  });
});
