# Monorepo Tsconfig Paths Package Instructions

## Scope

This package is WIP. Treat runtime `tsconfig` alias resolution as a fragile
integration surface across Node loaders, `tsx`, Vite-based SSR tools, workspace
package exports, generated files, and long-running dev servers.

`@unimolecule/monorepo-tsconfig-paths` owns runtime resolution of TypeScript
`compilerOptions.paths` for monorepos. It resolves aliases from the importing
file's package context instead of `process.cwd()`, and exposes wrapper CLI,
Node register, Node loader, debug diagnostics, and core resolver primitives.

## Boundary Rules

- Keep the core resolver independent from runtime adapters.
- Keep package discovery, tsconfig loading, path matching, and candidate probing
  under `src/core`.
- Keep Node process integration under `src/node`.
- Keep command parsing, child process launch, and debug command wiring under
  `src/cli`.
- Do not move monorepo-specific tsconfig behavior into `@unimolecule/utils`.
- Prefer direct `@unimolecule/utils/node/*` subpath imports for shared Node
  helpers; do not import the whole `@unimolecule/utils/node` barrel from this
  package.
- Recommended mitigation for affected monorepos: use `tsconfig` aliases in
  `apps/*` only; avoid `tsconfig` aliases in `packages/*`, and consume workspace
  packages through package names or explicit package subpaths.
- Do not add app-specific aliases, Vite project assumptions, or workspace
  business rules to the resolver.
- Do not claim broad runner support until there is a fixture test for that
  runtime path.

## Implementation Rules

- Use `@unimolecule/utils` for shared low-level helpers such as path existence
  checks and cross-platform spawning before adding local equivalents.
- Keep JSONC parsing, tsconfig `extends` handling, TypeScript path matching, and
  runtime resolution diagnostics local to this package.
- Preserve importer-aware behavior as the primary invariant: repeated aliases
  such as `@/*` must resolve using the importer package's tsconfig.
- Avoid relying on `process.cwd()` for alias ownership decisions.
- Leave relative imports, absolute paths, Node builtins, URL imports, package
  imports, and package imports (`#...`) to the host runtime.
- Keep loader/register behavior narrow and covered by runtime tests before
  broadening CommonJS, Vite, tsx, or other adapter support.
- Use explicit `.ts` extensions for local TypeScript source imports that are
  loaded directly by Node source-mode paths.

## Documentation

- README files must describe this as a library package: purpose, design,
  entrypoints, resolution model, configuration, usage, runtime notes, and
  gotchas.
- Keep `README.md` and `README.zh-CN.md` structurally aligned.
- Document wrapper mode as the primary user path and register/loader surfaces as
  advanced integration points.
- When documenting runtime support, distinguish Vite config loading from Vite
  application module graph resolution.

## Verification

- Run `pnpm -F @unimolecule/monorepo-tsconfig-paths test` for resolver, CLI, or
  runtime behavior changes.
- Run `pnpm -F @unimolecule/monorepo-tsconfig-paths build` for export, package
  metadata, register, loader, or CLI entry changes.
- Run `pnpm -F @unimolecule/monorepo-tsconfig-paths lint` after broad
  TypeScript or Markdown edits.
- Run a package-scoped TypeScript check when changing public types, Node loader
  signatures, or core resolver return shapes.
