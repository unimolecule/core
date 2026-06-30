import { describe, expect, it } from "vitest";
import {
  AppError,
  AppResponse,
  createCursorPagination,
  createError,
  createPagePagination,
  createResponse,
  RESPONSE_ERROR_CODE,
  RESPONSE_ERROR_MESSAGE,
  RESPONSE_ERROR_OK,
  RESPONSE_SUCCESS_CODE,
  RESPONSE_SUCCESS_MESSAGE,
  RESPONSE_SUCCESS_OK,
} from "../src/http";
import { HTTP_STATUS_CODES } from "../src/http/status-codes";

describe("HTTP contracts", () => {
  it("creates default success response envelopes", () => {
    expect(createResponse()).toEqual({
      code: RESPONSE_SUCCESS_CODE,
      message: RESPONSE_SUCCESS_MESSAGE,
      success: RESPONSE_SUCCESS_OK,
      data: null,
      requestId: undefined,
    });

    expect(new AppResponse({})).toMatchObject({
      code: RESPONSE_SUCCESS_CODE,
      message: RESPONSE_SUCCESS_MESSAGE,
      success: RESPONSE_SUCCESS_OK,
      data: null,
      requestId: "",
    });
  });

  it("creates custom success response envelopes", () => {
    const data = { id: "user_1" };

    expect(
      createResponse({
        status: HTTP_STATUS_CODES.CREATED.code,
        message: HTTP_STATUS_CODES.CREATED.phrase,
        data,
        requestId: "req_1",
      }),
    ).toEqual({
      code: 201,
      message: "Created",
      success: true,
      data,
      requestId: "req_1",
    });
  });

  it("creates default error response envelopes", () => {
    expect(createError()).toEqual({
      code: RESPONSE_ERROR_CODE,
      message: RESPONSE_ERROR_MESSAGE,
      success: RESPONSE_ERROR_OK,
      data: null,
      requestId: undefined,
      details: undefined,
    });
  });

  it("preserves AppError metadata and default exposure rules", () => {
    const clientError = new AppError({
      status: HTTP_STATUS_CODES.BAD_REQUEST.code,
      message: "Invalid cursor.",
      data: { cursor: "bad" },
      details: { field: "cursor" },
      headers: { "x-retry": "never" },
      requestId: "req_2",
    });

    expect(clientError).toBeInstanceOf(Error);
    expect(clientError).toMatchObject({
      name: "AppError",
      message: "Invalid cursor.",
      status: 400,
      code: 400,
      success: false,
      data: { cursor: "bad" },
      expose: true,
      details: { field: "cursor" },
      headers: { "x-retry": "never" },
      requestId: "req_2",
    });

    expect(new AppError({ status: 500 }).expose).toBe(false);
    expect(new AppError({ status: 500, expose: true }).expose).toBe(true);
  });

  it("creates pagination metadata without owning query parsing", () => {
    expect(
      createCursorPagination({
        hasNext: true,
        limit: 20,
        nextCursor: "next",
      }),
    ).toEqual({
      hasNext: true,
      limit: 20,
      mode: "cursor",
      nextCursor: "next",
    });

    expect(
      createPagePagination({
        hasNext: false,
        limit: 20,
        page: 2,
        total: 35,
      }),
    ).toEqual({
      hasNext: false,
      limit: 20,
      mode: "page",
      page: 2,
      total: 35,
    });
  });
});
