import { describe, expect, it } from "vitest";
import { createResponse, HTTP_STATUS_CODES } from "../src";

describe("package entry", () => {
  it("re-exports public canon contract primitives", () => {
    expect(createResponse({ data: { ok: true } })).toMatchObject({
      code: 200,
      success: true,
      data: { ok: true },
    });
    expect(HTTP_STATUS_CODES.NOT_FOUND).toEqual({
      code: 404,
      phrase: "Not Found",
    });
  });
});
