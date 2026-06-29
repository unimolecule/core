# Utils Package Instructions

## Scope

`@unimolecule/utils` owns small shared helpers for JSON, dates, strings, type guards, tree processing, random values, crypto hashes, sleep, common TypeScript utility types, and explicitly scoped runtime helpers under [`src/node`](./src/node) and [`src/web`](./src/web).

## Boundary Rules

- Keep helpers small, focused, and framework-neutral.
- Prefer pure functions whenever behavior can be expressed as pure logic.
- Avoid app-specific, Shopify-specific, or database-specific behavior here.
- Keep Node-only helpers under [`src/node`](./src/node) and expose them only through `@unimolecule/utils/node` or `@unimolecule/utils/node/*`.
- Keep browser-only helpers under [`src/web`](./src/web) and expose them only through `@unimolecule/utils/web` or `@unimolecule/utils/web/*`.
- Do not re-export Node-only helpers from the public root entry.
- Do not re-export browser-only helpers from the public root entry.
- Keep runtime-neutral crypto helpers on Web Crypto APIs when possible.

## Implementation Rules

- Other packages should prefer JSON helpers from this package over direct `JSON.parse` and `JSON.stringify`.
- Browser-related helpers must live in `src/web` and degrade safely in non-browser runtimes through `globalThis` checks.
- Avoid hard DOM type dependencies from the public entry when possible.
- Node-related helpers may depend on Node built-ins, but only inside `src/node`.
- Web-related helpers may depend on DOM types, but only inside `src/web` and the web tsconfig.
- Put shared public TypeScript helper types in `types.ts`.
- Add tests for edge cases, runtime fallbacks, serialization behavior, and type guard behavior.

## Documentation

- README must describe this as a library package: overview, design, inputs/outputs, examples, and runtime notes.
- Include examples for public helpers that are not self-evident.
- Keep runtime-entry documentation next to the owning entry: [`src/node/README.md`](./src/node/README.md) and [`src/web/README.md`](./src/web/README.md).

## Verification

- Run `pnpm -F @unimolecule/utils test` for behavior changes.
- Run `pnpm -F @unimolecule/utils build` for export or build changes.
- Run `pnpm -F @unimolecule/utils lint` after broad TypeScript or Markdown edits.
