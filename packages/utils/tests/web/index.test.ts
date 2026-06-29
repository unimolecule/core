import { describe, expect, it } from "vitest";

import * as webUtils from "../../src/web/index";

describe("web-only entry", () => {
  it("exports browser runtime helpers from a dedicated subpath", () => {
    expect(webUtils.Cookies).toBeTypeOf("object");
    expect(webUtils.createCookies).toBeTypeOf("function");
    expect(webUtils.rafDebounce).toBeTypeOf("function");
    expect(webUtils.rafThrottle).toBeTypeOf("function");
    expect(webUtils.rafSetTimeout).toBeTypeOf("function");
  });
});
