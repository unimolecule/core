import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

const spawnState = vi.hoisted(() => ({
  child: undefined as EventEmitter | undefined,
}));

vi.mock("node:child_process", () => ({
  spawn: vi.fn(() => {
    // eslint-disable-next-line unicorn/prefer-event-target
    spawnState.child = new EventEmitter();
    return spawnState.child;
  }),
  spawnSync: vi.fn(() => ({ signal: null, status: 0 })),
}));

describe("unifiedSpawnAsync cleanup", () => {
  it("removes child listeners after close", async () => {
    const { unifiedSpawnAsync } = await import("../../src/node/unified-spawn");
    const promise = unifiedSpawnAsync("node", ["--version"]);

    expect(spawnState.child?.listenerCount("error")).toBe(1);
    expect(spawnState.child?.listenerCount("close")).toBe(1);

    spawnState.child?.emit("close", 0);

    await expect(promise).resolves.toBe(0);
    expect(spawnState.child?.listenerCount("error")).toBe(0);
    expect(spawnState.child?.listenerCount("close")).toBe(0);
  });
});
