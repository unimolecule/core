---
"@unimolecule/oh-my-fetch": patch
"@unimolecule/canon": patch
"@unimolecule/utils": patch
"@unimolecule/document": patch
---

Added coverage and tightened package boundaries across the workspace. @unimolecule/canon now re-exports its HTTP contract primitives from both root and HTTP entrypoints, including constants and status codes, and includes tests for response/error envelopes, AppError, pagination helpers, and package exports. @unimolecule/oh-my-fetch now reuses shared @unimolecule/utils helpers for awaitable types and object/plain-object checks, reducing duplicated utility logic while preserving HTTP-client-specific behavior. Documentation formatting was refreshed, stale commented schema code and unused canon dependency metadata were removed, and the root contributor guidance now records that lint/type diagnostics from Markdown code blocks should be reported rather than fixed unless explicitly requested.
