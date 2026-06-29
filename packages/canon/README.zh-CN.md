# @unimolecule/canon

<p><a href="./README.md">English</a> | <strong>中文</strong></p>

`@unimolecule/canon` 提供 Unimolecule 包之间共享的 contract primitives。目前它聚焦于 HTTP response contract、error contract、status codes 和 pagination shape，不接管 validation schema 或 framework adapter。

## 设计

- `http/status-codes`：标准 HTTP status code 与 reason phrase 常量。
- `http/constants`：默认 success/error response 值。
- `http/response`：`SuccessResponse`、`AppResponse`、`createResponse`。
- `http/error`：`ErrorResponse`、`AppError`、`createError`。
- `http/pagination`：cursor/page pagination 类型与 response factory helper。

这个包只维护 contract 定义，不承载 request client、route metadata、OpenAPI 生成或 schema validation。业务包需要把这些 TypeScript contract 翻译成自己的 Zod、Valibot、OpenAPI 或 framework-specific schema。

## 默认行为

- 成功响应默认使用 `200`、`"OK"` 和 `success: true`。
- 错误响应默认使用 `500`、`"Internal Server Error"` 和 `success: false`。
- `AppError.expose` 对低于 `500` 的状态码默认是 `true`。
- Pagination 支持 cursor 与 page 两种 response envelope。
- HTTP contract 层不引入 schema library。

## 基础用法

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

## 入口

| 入口                                   | 用途                                     |
| -------------------------------------- | ---------------------------------------- |
| `@unimolecule/canon`                   | 当前导出的所有 contract primitives       |
| `@unimolecule/canon/http`              | HTTP response、error、status、pagination |
| `@unimolecule/canon/http-status-codes` | HTTP status code 与 phrase 常量          |

## Response Contracts

`SuccessResponse<T>` 是共享成功响应 envelope。

```ts
import type { SuccessResponse } from "@unimolecule/canon/http";

type User = {
  id: string;
  name: string;
};

type UserResponse = SuccessResponse<User>;
```

运行时代码需要标准 envelope 和默认值时，使用 `createResponse()`。

```ts
const userResponse = createResponse<User>({
  data: {
    id: "user_1",
    name: "Ada",
  },
});
```

## Error Contracts

`ErrorResponse<T>` 描述序列化后的错误结构。`AppError` 是轻量 runtime error，携带 status、expose、headers、request id、details 和 data。

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

Pagination contract 只描述响应 metadata。Query validation、deep pagination 限制、cursor parsing 和 database seek 策略属于拥有 API 的业务包。

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

## 业务 Schema

Schema factory 应放在业务 contract 层，再用 canon 类型约束 schema 输出与共享 response shape 对齐。

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

## 运行时说明

HTTP contract 层是 runtime-neutral TypeScript。它不依赖 Fetch、`ky`、Hono、OpenAPI、Zod、database adapter、request parsing、logging 或应用 UI。
