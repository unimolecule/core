# Canon Package Instructions

## Scope

`@unimolecule/canon` owns shared contract primitives for the workspace. Its current boundary is HTTP status constants, response and error envelopes, lightweight runtime factories, and pagination response shapes.

## Architecture Rules

- Keep canon small, stable, and runtime-neutral.
- Keep request clients, transport behavior, route handlers, OpenAPI generation, schema validation, logging providers, database seek logic, and application UI out of this package.
- Put protocol facts and reusable envelope types in `src/http/`.
- Keep schema factories in business contract packages or applications, not in canon.
- Prefer explicit subpath exports when a public contract area grows large enough to consume independently.

## HTTP Contract Rules

- `HTTP_STATUS_CODES` is the single source for status code and phrase constants.
- `createResponse()` and `createError()` should only fill shared envelope defaults.
- `AppError` should stay a lightweight HTTP-aware error, not a framework exception.
- Pagination helpers should describe response metadata only. Query parsing, cursor decoding, deep pagination limits, and database strategies belong to business code.
- Do not reintroduce `@hono/zod-openapi`, Zod, Valibot, or other validation dependencies into the core HTTP contract layer.

## File Organization

- Keep HTTP constants in `src/http/constants.ts`.
- Keep status code data in `src/http/status-codes.ts`.
- Keep success response types and factories in `src/http/response.ts`.
- Keep error response types and factories in `src/http/error.ts`.
- Keep pagination response types and factories in `src/http/pagination.ts`.
- Re-export stable public HTTP contracts from `src/http/index.ts`.

## Documentation

- README must describe this as a contract package, not a client, server, or schema package.
- Include examples for new public response, error, status, or pagination exports.
- Keep `README.md` and `README.zh-CN.md` structurally aligned.
- When adding a new public contract area, document what canon owns and what remains in business packages.

## Verification

- Run `pnpm -F @unimolecule/canon build` for export or build changes.
- Run `pnpm -F @unimolecule/canon test` for behavior changes.
- Run `pnpm -F @unimolecule/canon lint` after broad TypeScript or Markdown edits.
