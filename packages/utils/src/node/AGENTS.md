# Node Runtime Helper Instructions

## Scope

`@unimolecule/utils/node` owns Node.js runtime helpers for filesystem probes, process spawning, command execution, monorepo discovery, local network addresses, ESM `require`, and graceful shutdown wiring.

## Boundary Rules

- This entry is Node-only.
- Do not import it from browser or Cloudflare Worker isolate code.
- Do not add browser, Worker, Shopify, or Hono-specific behavior here.
- Keep helpers framework-neutral and script-friendly.
- Avoid hidden global state when explicit inputs are practical.

## Implementation Rules

- Avoid string shell execution for command probes and spawning paths.
- Prefer argument arrays for spawned commands.
- Clean up timers, child process handlers, and process listeners owned by this entry.
- Keep public names stable so scripts and app runtime code can migrate gradually.
- Put reusable public types in `types.ts` when a helper's option/result shape becomes shared.
- Add examples for non-obvious process, monorepo, or shutdown helpers.

## Documentation

- Node README must describe this as a library entry: overview, design, usage, API table, and Node runtime notes.
- Update Node README when adding exports, changing command execution behavior, or changing graceful-exit behavior.

## Verification

- Run `pnpm -F @unimolecule/utils test tests/node` for behavior changes.
- Run `pnpm -F @unimolecule/utils build` for export or build changes.
- Run `pnpm -F @unimolecule/utils lint` after broad TypeScript or Markdown edits.
