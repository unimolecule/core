# Web Runtime Helper Instructions

## Scope

`@unimolecule/utils/web` owns browser-oriented runtime helpers for cookie access and requestAnimationFrame-driven scheduling.

## Boundary Rules

- This entry is web-only.
- Do not import it from Node-only scripts, package root utilities, or server runtime code.
- Do not add Node built-ins, process APIs, filesystem access, Hono, Shopify, or framework-specific behavior here.
- Keep helpers browser-platform focused and safe to test under jsdom.
- Prefer `globalThis` feature checks over direct assumptions about `window`, `document`, or `requestAnimationFrame`.

## Implementation Rules

- Keep `document.cookie` access behind runtime checks so non-browser-like environments no-op safely.
- Put shared runtime-neutral scheduling logic in `src/timer.ts`; keep `raf.ts` focused on the requestAnimationFrame scheduler.
- Use `performance.now()` for elapsed-time scheduling logic.
- Reuse shared serialization helpers from `json.ts` for cookie JSON values.
- Keep public names stable so browser apps can migrate gradually from local copies.
- Put reusable public types next to the owning helper unless the shape becomes shared across entries.

## Documentation

- Web README must describe this as a browser-focused library entry: overview, design, usage, API table, and web runtime notes.
- Update Web README when adding exports, changing cookie behavior, or changing raf scheduling behavior.

## Verification

- Run `pnpm -F @unimolecule/utils test tests/web` for browser-entry behavior changes.
- Run `pnpm -F @unimolecule/utils build` for export or build changes.
- Run `pnpm -F @unimolecule/utils lint` after broad TypeScript or Markdown edits.
