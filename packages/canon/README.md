# @unimolecule/canon

<p><strong>English</strong> | <a href="./README.zh-CN.md">中文</a></p>

`@unimolecule/canon` provides shared contract primitives for Unimolecule packages.
It currently focuses on HTTP response contracts, error contracts, status codes,
and pagination shapes without owning validation schemas or framework adapters.

## Design

- `http/status-codes`: canonical HTTP status code and reason phrase constants.
- `http/constants`: default success and error response values.
- `http/response`: `SuccessResponse`, `AppResponse`, and `createResponse`.
- `http/error`: `ErrorResponse`, `AppError`, and `createError`.
- `http/pagination`: cursor/page pagination types and response factory helpers.

The package keeps contract definitions separate from request clients, route
metadata, OpenAPI generation, and schema validation. Business packages should
translate these TypeScript contracts into their own Zod, Valibot, OpenAPI, or
framework-specific schemas.

## Defaults

- Successful responses default to `200`, `"OK"`, and `success: true`.
- Error responses default to `500`, `"Internal Server Error"`, and `success: false`.
- `AppError.expose` defaults to `true` for statuses below `500`.
- Pagination supports cursor and page response envelopes.
- No schema library is imported by the HTTP contract layer.

## Basic Usage

```ts
import { createError, createResponse } from "@unimolecule/canon/http";

const response = createResponse({
  data: {
    id: "user_1",
    name: "Ada",
  },
});

const error = createError({
  status: 404,
  message: "User not found.",
});
```

## Entrypoints

| Entrypoint                             | Use for                                      |
| -------------------------------------- | -------------------------------------------- |
| `@unimolecule/canon`                   | all currently exported contract primitives   |
| `@unimolecule/canon/http`              | HTTP response, error, status, and pagination |
| `@unimolecule/canon/http-status-codes` | HTTP status code and phrase constants        |

## Response Contracts

`SuccessResponse<T>` is the shared success envelope.

```ts
import type { SuccessResponse } from "@unimolecule/canon/http";

type User = {
  id: string;
  name: string;
};

type UserResponse = SuccessResponse<User>;
```

Use `createResponse()` when runtime code needs the standard envelope and
default values.

```ts
const userResponse = createResponse<User>({
  data: {
    id: "user_1",
    name: "Ada",
  },
});
```

## Error Contracts

`ErrorResponse<T>` describes serialized errors. `AppError` is a lightweight
runtime error carrying status, exposure, headers, request id, details, and data.

```ts
import { AppError } from "@unimolecule/canon/http";

throw new AppError({
  status: 400,
  message: "Invalid cursor.",
  expose: true,
  details: {
    field: "cursor",
  },
});
```

## Pagination

Pagination contracts describe response metadata only. Query validation, deep
pagination limits, cursor parsing, and database seek strategies belong in the
business package that owns the API.

```ts
import {
  createCursorPagination,
  createPagePagination,
  type Pagination,
} from "@unimolecule/canon/http";

const cursorPagination: Pagination = createCursorPagination({
  hasNext: true,
  limit: 20,
  nextCursor: "next",
});

const pagePagination = createPagePagination({
  hasNext: false,
  limit: 20,
  page: 1,
  total: 12,
});
```

## Business Schemas

Keep schema factories in the business contract layer, then use canon types to
align the schema output with shared response shapes.

```ts
import { z } from "@hono/zod-openapi";
import type { SuccessResponse } from "@unimolecule/canon/http";

export const successResponseSchema = <TDataSchema extends z.ZodTypeAny>(
  dataSchema: TDataSchema,
) =>
  z.object({
    code: z.number(),
    message: z.string(),
    success: z.literal(true),
    data: dataSchema.nullable(),
    requestId: z.string().optional(),
  }) satisfies z.ZodType<SuccessResponse<z.infer<TDataSchema>>>;
```

## Runtime Notes

The HTTP contract layer is runtime-neutral TypeScript. It does not depend on
Fetch, `ky`, Hono, OpenAPI, Zod, database adapters, request parsing, logging, or
application UI.
