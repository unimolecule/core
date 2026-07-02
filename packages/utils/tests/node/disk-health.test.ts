import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkProcessDiskUsage,
  getProcessDiskUsage,
} from "../../src/node/disk";

const tempDirs: string[] = [];

async function createTempDir() {
  const dir = await mkdtemp(join(tmpdir(), "utils-node-disk-"));
  tempDirs.push(dir);
  return dir;
}

describe("process disk usage helpers", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((dir) => rm(dir, { force: true, recursive: true })),
    );
  });

  it("returns filesystem usage for a checked path", async () => {
    const dir = await createTempDir();
    const usage = await getProcessDiskUsage({ path: dir });

    expect(usage.path).toBe(dir);
    expect(usage.totalBytes).toBeGreaterThan(0);
    expect(usage.freeBytes).toBeGreaterThanOrEqual(0);
    expect(usage.availableBytes).toBeGreaterThanOrEqual(0);
    expect(usage.usedBytes).toBeGreaterThanOrEqual(0);
    expect(usage.usedPercent).toBeGreaterThanOrEqual(0);
    expect(usage.usedPercent).toBeLessThanOrEqual(1);
  });

  it("marks disk usage ok when thresholds are satisfied", async () => {
    const dir = await createTempDir();

    await expect(
      checkProcessDiskUsage({
        maxUsedPercent: 1,
        minAvailableBytes: 0,
        path: dir,
      }),
    ).resolves.toMatchObject({
      checks: {
        availableBytes: {
          minBytes: 0,
          status: "ok",
        },
        usedPercent: {
          maxPercent: 1,
          status: "ok",
        },
      },
      path: dir,
      status: "ok",
    });
  });

  it("marks disk usage error when available bytes are below the threshold", async () => {
    const dir = await createTempDir();
    const usage = await getProcessDiskUsage({ path: dir });

    await expect(
      checkProcessDiskUsage({
        minAvailableBytes: usage.availableBytes + 1,
        path: dir,
      }),
    ).resolves.toMatchObject({
      checks: {
        availableBytes: {
          availableBytes: usage.availableBytes,
          minBytes: usage.availableBytes + 1,
          status: "error",
        },
      },
      path: dir,
      status: "error",
    });
  });

  it("marks disk usage error when used percent exceeds the threshold", async () => {
    const dir = await createTempDir();
    const result = await checkProcessDiskUsage({
      maxUsedPercent: 0,
      path: dir,
    });

    expect(result).toMatchObject({
      checks: {
        usedPercent: {
          maxPercent: 0,
          status: result.usedPercent > 0 ? "error" : "ok",
          usedPercent: result.usedPercent,
        },
      },
      path: dir,
      status: result.usedPercent > 0 ? "error" : "ok",
    });
  });
});
