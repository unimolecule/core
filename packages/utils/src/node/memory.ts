export type ProcessMemoryUsage = {
  arrayBuffersBytes: number;
  externalBytes: number;
  heapTotalBytes: number;
  heapUsedBytes: number;
  rssBytes: number;
};

export type ProcessMemoryUsageCheckOptions = {
  maxHeapUsedBytes?: number;
  maxRssBytes?: number;
};

export type ProcessMemoryUsageCheck = {
  maxBytes: number;
  status: "error" | "ok";
  usedBytes: number;
  usedPercent: number;
};

export type ProcessMemoryUsageCheckResult = ProcessMemoryUsage & {
  checks: {
    heap?: ProcessMemoryUsageCheck;
    rss?: ProcessMemoryUsageCheck;
  };
  message?: string;
  status: "error" | "ok";
};

/**
 * Read the current process memory usage with byte-oriented field names.
 *
 * @example
 * ```ts
 * const usage = getProcessMemoryUsage();
 * ```
 */
export function getProcessMemoryUsage(): ProcessMemoryUsage {
  const usage = process.memoryUsage();

  return {
    arrayBuffersBytes: usage.arrayBuffers ?? 0,
    externalBytes: usage.external,
    heapTotalBytes: usage.heapTotal,
    heapUsedBytes: usage.heapUsed,
    rssBytes: usage.rss,
  };
}

/**
 * Read process memory usage and compare it with optional thresholds.
 *
 * @example
 * ```ts
 * const result = checkProcessMemoryUsage({ maxHeapUsedBytes: 150 * 1024 * 1024 });
 * ```
 */
export function checkProcessMemoryUsage(
  options: ProcessMemoryUsageCheckOptions = {},
): ProcessMemoryUsageCheckResult {
  assertMemoryThresholds(options);

  const usage = getProcessMemoryUsage();
  const checks: ProcessMemoryUsageCheckResult["checks"] = {};
  const messages: string[] = [];

  if (options.maxHeapUsedBytes !== undefined) {
    checks.heap = createMemoryCheck(
      "heap",
      usage.heapUsedBytes,
      options.maxHeapUsedBytes,
      messages,
    );
  }

  if (options.maxRssBytes !== undefined) {
    checks.rss = createMemoryCheck(
      "rss",
      usage.rssBytes,
      options.maxRssBytes,
      messages,
    );
  }

  return {
    ...usage,
    checks,
    message: messages.length > 0 ? messages.join("; ") : undefined,
    status: messages.length > 0 ? "error" : "ok",
  };
}

function assertMemoryThresholds(options: ProcessMemoryUsageCheckOptions): void {
  if (options.maxHeapUsedBytes !== undefined && options.maxHeapUsedBytes < 0) {
    throw new RangeError("maxHeapUsedBytes must be greater than or equal to 0");
  }

  if (options.maxRssBytes !== undefined && options.maxRssBytes < 0) {
    throw new RangeError("maxRssBytes must be greater than or equal to 0");
  }
}

function createMemoryCheck(
  name: "heap" | "rss",
  usedBytes: number,
  maxBytes: number,
  messages: string[],
): ProcessMemoryUsageCheck {
  const status = usedBytes > maxBytes ? "error" : "ok";

  if (status === "error") {
    messages.push(`${name} used bytes ${usedBytes} exceeds ${maxBytes}`);
  }

  return {
    maxBytes,
    status,
    usedBytes,
    usedPercent: maxBytes > 0 ? usedBytes / maxBytes : usedBytes > 0 ? 1 : 0,
  };
}
