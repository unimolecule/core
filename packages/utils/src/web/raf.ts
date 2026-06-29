import { throwError } from "../error";
import {
  createDebounce,
  createThrottle,
  type ScheduledTask,
  type TimerCallback,
  type TimerScheduler,
} from "../timer";

type RafHandle = number | ReturnType<typeof setTimeout>;

const scope = globalThis as typeof globalThis & {
  requestAnimationFrame?: (callback: () => void) => number;
  cancelAnimationFrame?: (handle: number) => void;
};

function requestFrame(callback: () => void): RafHandle {
  if (scope.requestAnimationFrame) {
    return scope.requestAnimationFrame(callback);
  }

  return setTimeout(callback, 0);
}

function cancelFrame(handle: RafHandle): void {
  if (typeof handle === "number" && scope.cancelAnimationFrame) {
    scope.cancelAnimationFrame(handle);
    return;
  }

  clearTimeout(handle as ReturnType<typeof setTimeout>);
}

const rafScheduler: TimerScheduler = {
  now: () => performance.now(),
  schedule: (callback, delay): ScheduledTask => {
    let handle: RafHandle | undefined;
    const start = performance.now();

    const loop = () => {
      if (performance.now() - start >= delay) {
        callback();
        return;
      }

      handle = requestFrame(loop);
    };

    handle = requestFrame(loop);

    return {
      cancel: () => {
        if (handle !== undefined) {
          cancelFrame(handle);
        }
      },
    };
  },
};

function withRafErrorScope<T extends TimerCallback>(
  scopeName: string,
  callback: T,
): T {
  return ((...args: Parameters<T>) => {
    try {
      Promise.resolve(callback(...args)).catch((error: unknown) => {
        throwError(scopeName, `Callback error: ${error}`);
      });
    } catch (error: unknown) {
      throwError(scopeName, `Callback error: ${error}`);
    }
  }) as T;
}

/**
 * Run a callback once after delay using raf-compatible scheduling.
 *
 * @param callback - Callback to execute.
 * @param delay - Delay in milliseconds.
 */
export function rafSetTimeout(callback: TimerCallback, delay: number) {
  const task = rafScheduler.schedule(
    () => withRafErrorScope("rafSetTimeout", callback)(),
    delay,
  );

  return () => task.cancel();
}

/**
 * Run a callback repeatedly with raf-compatible scheduling.
 *
 * @param callback - Callback to execute.
 * @param interval - Interval in milliseconds.
 */
export function rafSetInterval(callback: TimerCallback, interval: number) {
  let task: ScheduledTask | undefined;
  const safeCallback = withRafErrorScope("rafSetInterval", callback);

  const loop = () => {
    safeCallback();
    task = rafScheduler.schedule(loop, interval);
  };

  task = rafScheduler.schedule(loop, interval);

  return () => task?.cancel();
}

/**
 * Create a debounced callback driven by requestAnimationFrame.
 *
 * @param callback - Callback to debounce.
 * @param delay - Debounce delay in milliseconds.
 */
export function rafDebounce<T extends TimerCallback>(
  callback: T,
  delay: number,
) {
  return createDebounce(
    withRafErrorScope("rafDebounce", callback),
    delay,
    rafScheduler,
  );
}

/**
 * Create a throttled callback driven by requestAnimationFrame.
 *
 * @param callback - Callback to throttle.
 * @param interval - Minimum interval between executions in milliseconds.
 */
export function rafThrottle<T extends TimerCallback>(
  callback: T,
  interval: number,
) {
  return createThrottle(
    withRafErrorScope("rafThrottle", callback),
    interval,
    rafScheduler,
  );
}
