import { afterEach, describe, expect, it, vi } from "vitest";
import { debounce, throttle } from "../src/timer";

describe("timer utilities", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces calls with setTimeout and keeps the latest arguments", async () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const debounced = debounce(callback, 30);

    debounced("first");
    await vi.advanceTimersByTimeAsync(20);
    debounced("latest");
    await vi.advanceTimersByTimeAsync(29);
    expect(callback).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("latest");
  });

  it("cancels pending debounced calls", async () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const debounced = debounce(callback, 30);

    debounced("cancelled");
    debounced.cancel();
    await vi.advanceTimersByTimeAsync(30);

    expect(callback).not.toHaveBeenCalled();
  });

  it("throttles calls with setTimeout and keeps the latest trailing arguments", async () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const throttled = throttle(callback, 30);

    throttled("first");
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("first");

    throttled("second");
    await vi.advanceTimersByTimeAsync(10);
    throttled("latest");
    await vi.advanceTimersByTimeAsync(19);
    expect(callback).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith("latest");
  });

  it("cancels pending throttled calls", async () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const throttled = throttle(callback, 30);

    throttled("first");
    throttled("cancelled");
    throttled.cancel();
    await vi.advanceTimersByTimeAsync(30);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("first");
  });
});
