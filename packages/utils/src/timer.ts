export type TimerCallback = (...args: any[]) => unknown;

export type ScheduledTask = {
  cancel: () => void;
};

export type TimerScheduler = {
  now: () => number;
  schedule: (callback: () => void, delay: number) => ScheduledTask;
};

export type CancelableFunction<T extends TimerCallback> = ((
  ...args: Parameters<T>
) => void) & {
  cancel: () => void;
};

const timeoutScheduler: TimerScheduler = {
  now: () => performance.now(),
  schedule: (callback, delay) => {
    const handle = setTimeout(callback, Math.max(0, delay));
    return {
      cancel: () => clearTimeout(handle),
    };
  },
};

export function createDebounce<T extends TimerCallback>(
  callback: T,
  wait: number,
  scheduler: TimerScheduler = timeoutScheduler,
): CancelableFunction<T> {
  let task: ScheduledTask | undefined;
  let pendingArgs: Parameters<T> | undefined;

  const run = () => {
    task = undefined;
    const args = pendingArgs;
    pendingArgs = undefined;

    if (args) {
      callback(...args);
    }
  };

  const debounced = ((...args: Parameters<T>) => {
    pendingArgs = args;
    task?.cancel();
    task = scheduler.schedule(run, wait);
  }) as CancelableFunction<T>;

  debounced.cancel = () => {
    task?.cancel();
    task = undefined;
    pendingArgs = undefined;
  };

  return debounced;
}

export function createThrottle<T extends TimerCallback>(
  callback: T,
  wait: number,
  scheduler: TimerScheduler = timeoutScheduler,
): CancelableFunction<T> {
  let lastRun = Number.NEGATIVE_INFINITY;
  let task: ScheduledTask | undefined;
  let pendingArgs: Parameters<T> | undefined;

  const run = (args: Parameters<T>) => {
    lastRun = scheduler.now();
    callback(...args);
  };

  const runTrailing = () => {
    task = undefined;
    const args = pendingArgs;
    pendingArgs = undefined;

    if (args) {
      run(args);
    }
  };

  const throttled = ((...args: Parameters<T>) => {
    const remaining = wait - (scheduler.now() - lastRun);

    if (remaining <= 0) {
      task?.cancel();
      task = undefined;
      pendingArgs = undefined;
      run(args);
      return;
    }

    pendingArgs = args;
    task ??= scheduler.schedule(runTrailing, remaining);
  }) as CancelableFunction<T>;

  throttled.cancel = () => {
    task?.cancel();
    task = undefined;
    pendingArgs = undefined;
  };

  return throttled;
}

export function debounce<T extends TimerCallback>(
  callback: T,
  wait: number,
): CancelableFunction<T> {
  return createDebounce(callback, wait);
}

export function throttle<T extends TimerCallback>(
  callback: T,
  wait: number,
): CancelableFunction<T> {
  return createThrottle(callback, wait);
}
