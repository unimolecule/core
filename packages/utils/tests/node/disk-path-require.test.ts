import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkProcessDiskAccess } from "../../src/node/disk";
import { formatPath } from "../../src/node/format-path";
import { pathExists, pathExistsSync } from "../../src/node/path-exists";
import { require } from "../../src/node/require";
import { userHome } from "../../src/node/user-home";

const tempDirs: string[] = [];

async function createTempDir() {
  const dir = await mkdtemp(join(tmpdir(), "utils-node-"));
  tempDirs.push(dir);
  return dir;
}

describe("filesystem and path helpers", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((dir) => rm(dir, { force: true, recursive: true })),
    );
  });

  it("checks read/write access for an explicit path", async () => {
    const dir = await createTempDir();

    await expect(checkProcessDiskAccess(dir)).resolves.toBe(dir);
  });

  it("reports path existence asynchronously and synchronously", async () => {
    const dir = await createTempDir();
    const missing = join(dir, "missing");

    await expect(pathExists(dir)).resolves.toBe(true);
    await expect(pathExists(missing)).resolves.toBe(false);
    expect(pathExistsSync(dir)).toBe(true);
    expect(pathExistsSync(missing)).toBe(false);
  });

  it("normalizes backslash separators without touching unix paths", () => {
    expect(formatPath(String.raw`C:\Users\i7eo\app`)).toBe("C:/Users/i7eo/app");
    expect(formatPath("/Users/i7eo/app")).toBe("/Users/i7eo/app");
  });

  it("exposes node require and the current user home", () => {
    expect(require.resolve("node:path")).toBe("node:path");
    expect(userHome).toBeTruthy();
  });
});
