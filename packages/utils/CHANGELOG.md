# @unimolecule/utils

## 0.1.4

### Patch Changes

- [`3c763d2`](https://github.com/unimolecule/core/commit/3c763d2197859402adde20764d7e02a870690272) Thanks [@i7eo](https://github.com/i7eo)! - feat disk & memory check

## 0.1.3

### Patch Changes

- [`ba3051f`](https://github.com/unimolecule/core/commit/ba3051f453af11a1091eeee0d1cbf34d15fc298a) Thanks [@i7eo](https://github.com/i7eo)! - refactor output-entry-builder, support `entries`

## 0.1.2

### Patch Changes

- [`bb74320`](https://github.com/unimolecule/core/commit/bb7432071d7940b9388d32766170046c5124451e) Thanks [@i7eo](https://github.com/i7eo)! - use node shims in node-only bundler

## 0.1.1

### Patch Changes

- [`ba078d1`](https://github.com/unimolecule/core/commit/ba078d144cbfffa8f16622085ca0bdf020f2ccd2) Thanks [@i7eo](https://github.com/i7eo)! - Modify the bundler's config loader from native node to tsx.

## 0.1.0

### Minor Changes

- [`4320245`](https://github.com/unimolecule/core/commit/43202456ab1bcd4e3793a27c9e1fbda78c77c5b3) Thanks [@i7eo](https://github.com/i7eo)! - Generate a unified changelog

## 0.0.1

### Patch Changes

- [`16e1fda`](https://github.com/unimolecule/core/commit/16e1fda59742e063aaae575fe270fc30f79a4558) Thanks [@i7eo](https://github.com/i7eo)! - Added coverage and tightened package boundaries across the workspace. @unimolecule/canon now re-exports its HTTP contract primitives from both root and HTTP entrypoints, including constants and status codes, and includes tests for response/error envelopes, AppError, pagination helpers, and package exports. @unimolecule/oh-my-fetch now reuses shared @unimolecule/utils helpers for awaitable types and object/plain-object checks, reducing duplicated utility logic while preserving HTTP-client-specific behavior. Documentation formatting was refreshed, stale commented schema code and unused canon dependency metadata were removed, and the root contributor guidance now records that lint/type diagnostics from Markdown code blocks should be reported rather than fixed unless explicitly requested.
