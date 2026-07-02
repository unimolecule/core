import { describe, expect, it } from "vitest";
import {
  checkProcessMemoryUsage,
  getProcessMemoryUsage,
} from "../../src/node/memory";

describe("process memory usage helpers", () => {
  it("returns process memory usage with byte-oriented field names", () => {
    const usage = getProcessMemoryUsage();

    expect(usage.rssBytes).toBeGreaterThan(0);
    expect(usage.heapTotalBytes).toBeGreaterThan(0);
    expect(usage.heapUsedBytes).toBeGreaterThan(0);
    expect(usage.externalBytes).toBeGreaterThanOrEqual(0);
    expect(usage.arrayBuffersBytes).toBeGreaterThanOrEqual(0);
  });

  it("marks memory usage ok when configured limits are above current usage", () => {
    const maxHeapUsedBytes = Number.MAX_SAFE_INTEGER;
    const maxRssBytes = Number.MAX_SAFE_INTEGER;
    const result = checkProcessMemoryUsage({
      maxHeapUsedBytes,
      maxRssBytes,
    });

    expect(result).toMatchObject({
      status: "ok",
      checks: {
        heap: {
          status: "ok",
          maxBytes: maxHeapUsedBytes,
        },
        rss: {
          status: "ok",
          maxBytes: maxRssBytes,
        },
      },
    });
    expect(result.checks.heap?.usedPercent).toBeGreaterThanOrEqual(0);
    expect(result.checks.rss?.usedPercent).toBeGreaterThanOrEqual(0);
  });

  it("marks memory usage error when a configured limit is exceeded", () => {
    const result = checkProcessMemoryUsage({
      maxHeapUsedBytes: 0,
    });

    expect(result).toMatchObject({
      status: "error",
      checks: {
        heap: {
          status: "error",
          maxBytes: 0,
        },
      },
    });
    expect(result.message).toContain("heap");
  });
});
