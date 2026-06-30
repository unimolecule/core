# @unimolecule/oh-my-fetch

## 0.1.1

### Patch Changes

- [`ba078d1`](https://github.com/unimolecule/core/commit/ba078d144cbfffa8f16622085ca0bdf020f2ccd2) Thanks [@i7eo](https://github.com/i7eo)! - Modify the bundler's config loader from native node to tsx.

- Updated dependencies [[`ba078d1`](https://github.com/unimolecule/core/commit/ba078d144cbfffa8f16622085ca0bdf020f2ccd2)]:
  - @unimolecule/canon@0.1.1
  - @unimolecule/utils@0.1.1

## 0.1.0

### Minor Changes

- [`4320245`](https://github.com/unimolecule/core/commit/43202456ab1bcd4e3793a27c9e1fbda78c77c5b3) Thanks [@i7eo](https://github.com/i7eo)! - Generate a unified changelog

### Patch Changes

- Updated dependencies [[`4320245`](https://github.com/unimolecule/core/commit/43202456ab1bcd4e3793a27c9e1fbda78c77c5b3)]:
  - @unimolecule/canon@0.1.0
  - @unimolecule/utils@0.1.0

## 0.0.1

### Patch Changes

- [`16e1fda`](https://github.com/unimolecule/core/commit/16e1fda59742e063aaae575fe270fc30f79a4558) Thanks [@i7eo](https://github.com/i7eo)! - Added coverage and tightened package boundaries across the workspace. @unimolecule/canon now re-exports its HTTP contract primitives from both root and HTTP entrypoints, including constants and status codes, and includes tests for response/error envelopes, AppError, pagination helpers, and package exports. @unimolecule/oh-my-fetch now reuses shared @unimolecule/utils helpers for awaitable types and object/plain-object checks, reducing duplicated utility logic while preserving HTTP-client-specific behavior. Documentation formatting was refreshed, stale commented schema code and unused canon dependency metadata were removed, and the root contributor guidance now records that lint/type diagnostics from Markdown code blocks should be reported rather than fixed unless explicitly requested.

- Updated dependencies [[`16e1fda`](https://github.com/unimolecule/core/commit/16e1fda59742e063aaae575fe270fc30f79a4558)]:
  - @unimolecule/canon@0.0.1
  - @unimolecule/utils@0.0.1
