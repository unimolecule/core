import { describe, expect, it } from "vitest";
import {
  chunk,
  customAlphabet,
  debounce,
  ensurePrefix,
  nanoid,
  throttle,
} from "../src/index";

describe("index exports", () => {
  it("re-exports local utilities", () => {
    expect(ensurePrefix("/", "admin")).toBe("/admin");
  });

  it("exports shared collection and ID utilities", () => {
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
    expect(nanoid()).toHaveLength(21);
    expect(customAlphabet("ab", 4)()).toMatch(/^[ab]{4}$/);
    expect(debounce).toBeTypeOf("function");
    expect(throttle).toBeTypeOf("function");
  });
});
