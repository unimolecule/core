import { constants } from "node:fs";
import { access, statfs } from "node:fs/promises";

export type ProcessDiskUsage = {
  availableBytes: number;
  freeBytes: number;
  path: string;
  totalBytes: number;
  usedBytes: number;
  usedPercent: number;
};

export type ProcessDiskUsageOptions = {
  path?: string;
};

export type ProcessDiskUsageCheckOptions = ProcessDiskUsageOptions & {
  maxUsedPercent?: number;
  minAvailableBytes?: number;
};

export type ProcessDiskUsedPercentCheck = {
  maxPercent: number;
  message?: string;
  ratio?: number;
  status: "error" | "ok";
  usedPercent: number;
};

export type ProcessDiskAvailableBytesCheck = {
  availableBytes: number;
  message?: string;
  minBytes: number;
  ratio?: number;
  status: "error" | "ok";
};

export type ProcessDiskUsageCheckResult = ProcessDiskUsage & {
  checks: {
    availableBytes?: ProcessDiskAvailableBytesCheck;
    usedPercent?: ProcessDiskUsedPercentCheck;
  };
  status: "error" | "ok";
};

/**
 * Read filesystem usage for a path after verifying process access.
 *
 * @example
 * ```ts
 * const usage = await getProcessDiskUsage({ path: process.cwd() });
 * ```
 */
export async function getProcessDiskUsage(
  options: ProcessDiskUsageOptions = {},
): Promise<ProcessDiskUsage> {
  const path = await checkProcessDiskAccess(options.path);
  const stats = await statfs(path);
  const totalBytes = stats.blocks * stats.bsize;
  const freeBytes = stats.bfree * stats.bsize;
  const availableBytes = stats.bavail * stats.bsize;
  const usedBytes = Math.max(0, totalBytes - freeBytes);

  return {
    availableBytes,
    freeBytes,
    path,
    totalBytes,
    usedBytes,
    usedPercent: totalBytes > 0 ? usedBytes / totalBytes : 0,
  };
}

/**
 * Read filesystem usage and compare it with optional process thresholds.
 *
 * @example
 * ```ts
 * const result = await checkProcessDiskUsage({ maxUsedPercent: 0.9 });
 * ```
 */
export async function checkProcessDiskUsage(
  options: ProcessDiskUsageCheckOptions = {},
): Promise<ProcessDiskUsageCheckResult> {
  assertDiskThresholds(options);

  const usage = await getProcessDiskUsage(options);
  const checks: ProcessDiskUsageCheckResult["checks"] = {};

  if (options.maxUsedPercent !== undefined) {
    checks.usedPercent = createDiskUsedPercentCheck(
      usage.usedPercent,
      options.maxUsedPercent,
    );
  }

  if (options.minAvailableBytes !== undefined) {
    checks.availableBytes = createDiskAvailableBytesCheck(
      usage.availableBytes,
      options.minAvailableBytes,
    );
  }

  const status = hasFailedDiskChecks(checks) ? "error" : "ok";

  return {
    ...usage,
    checks,
    status,
  };
}

/**
 * Verify that the current process can read and write a disk path.
 *
 * @example
 * ```ts
 * const diskPath = await checkProcessDiskAccess(process.cwd());
 * ```
 */
async function checkProcessDiskAccess(
  diskPath: string = process.cwd(),
): Promise<string> {
  await access(diskPath, constants.R_OK | constants.W_OK);
  return diskPath;
}

function assertDiskThresholds(options: ProcessDiskUsageCheckOptions): void {
  if (
    options.maxUsedPercent !== undefined &&
    (options.maxUsedPercent < 0 || options.maxUsedPercent > 1)
  ) {
    throw new RangeError("maxUsedPercent must be between 0 and 1");
  }

  if (
    options.minAvailableBytes !== undefined &&
    options.minAvailableBytes < 0
  ) {
    throw new RangeError(
      "minAvailableBytes must be greater than or equal to 0",
    );
  }
}

function createDiskUsedPercentCheck(
  usedPercent: number,
  maxPercent: number,
): ProcessDiskUsedPercentCheck {
  const status = usedPercent > maxPercent ? "error" : "ok";
  return {
    maxPercent,
    message:
      status === "error"
        ? `disk used percent ${usedPercent} exceeds ${maxPercent}`
        : undefined,
    ratio: maxPercent > 0 ? usedPercent / maxPercent : undefined,
    status,
    usedPercent,
  };
}

function createDiskAvailableBytesCheck(
  availableBytes: number,
  minBytes: number,
): ProcessDiskAvailableBytesCheck {
  const status = availableBytes < minBytes ? "error" : "ok";

  return {
    availableBytes,
    message:
      status === "error"
        ? `disk available bytes ${availableBytes} is below ${minBytes}`
        : undefined,
    minBytes,
    ratio: minBytes > 0 ? availableBytes / minBytes : undefined,
    status,
  };
}

function hasFailedDiskChecks(
  checks: ProcessDiskUsageCheckResult["checks"],
): boolean {
  return Object.values(checks).some((check) => check?.status === "error");
}
