# @unimolecule/monorepo-tsconfig-paths

<p><strong>English</strong> | <a href="./README.zh-CN.md">中文</a></p>

## WIP Status

This package is **WIP**. Runtime `tsconfig` alias resolution in modern
monorepos has many moving parts: Node loader ordering, `tsx`, Vite-based SSR
tools, source-mode package exports, workspace package barrels, generated files,
and long-running dev servers all affect correctness and memory behavior.

For monorepos that hit this class of problem today, prefer the simpler project
layout first: use `tsconfig` aliases in `apps/*` only, and avoid `tsconfig`
aliases inside `packages/*`. Workspace packages should be consumed through
package names and explicit package subpaths instead of private source aliases.
That keeps library packages closer to their publish/runtime shape and avoids
loader-specific source-mode surprises.

`@unimolecule/monorepo-tsconfig-paths` resolves TypeScript
`compilerOptions.paths` at runtime in monorepos by using the importing file's
package context instead of `process.cwd()`. It is meant for workspaces where the
same alias, such as `@/*`, exists in many packages and must resolve to the
package that owns the importer.

## Design

- Wrapper-first CLI: run `mrp tsx`, `mrp vite`, `mrp node`, or `mrp debug` so the
  resolver can control loader ordering.
- Importer-aware resolution: find the package that owns the importing file, then
  read that package's `tsconfig`.
- Runtime-only behavior: resolve aliases for Node-driven runtime chains without
  rewriting source files or emitted files.
- Advanced hooks: expose register, loader, and core resolver surfaces for tools
  that already own their own process wrapper.
- Diagnostics: explain which package root, `tsconfig`, path pattern, and
  candidate file handled a specifier.

The package does not replace TypeScript, Vite, tsx, ts-node, or bundler plugins.
Its primary job is making repeated monorepo aliases deterministic during runtime
startup and config loading.

## Why Wrapper Mode

Single-project path resolvers usually load one `tsconfig`, often from the current
working directory. That breaks down when different packages reuse the same alias:

```text
apps/server/tsconfig.json      @/* -> apps/server/src/*
packages/envs/tsconfig.json    @/* -> packages/envs/src/*
```

If `packages/envs/src/configs/redis.ts` imports `@/constants`, the correct
target is `packages/envs/src/constants`, even when the process was launched from
`apps/server`.

The wrapper is the recommended entry because resolver composition order matters.
It can register the monorepo-aware resolver before a runner applies cwd-based
path handling, forward argv and stdio, preserve exit codes, and print useful
debug output.

## Getting Started

Install it as a development dependency in the workspace that runs your tools:

```sh
pnpm add -D @unimolecule/monorepo-tsconfig-paths
```

Use the `mrp` wrapper for common runtime commands:

```sh
mrp tsx ./scripts/inspect-env.ts
mrp vite build
mrp node --import tsx/esm ./vite.config.ts
```

Debug a single import from a concrete file:

```sh
mrp debug resolve "@/constants" \
  --from packages/envs/src/configs/redis.ts
```

Example output:

```text
specifier: @/constants
importer: packages/envs/src/configs/redis.ts
package root: packages/envs
tsconfig: packages/envs/tsconfig.json
matched path: @/*
candidate: packages/envs/src/constants/index.ts
result: resolved
```

## Entrypoints

| Surface                                             | Use for                                             |
| --------------------------------------------------- | --------------------------------------------------- |
| `mrp tsx <file> [args...]`                          | Run a TypeScript file through Node and `tsx` import |
| `mrp vite [vite args...]`                           | Load Vite config and config dependencies safely     |
| `mrp node [node args...]`                           | Run Node with the resolver injected first           |
| `mrp debug resolve <specifier> --from <file>`       | Inspect which package `tsconfig` handles an import  |
| `@unimolecule/monorepo-tsconfig-paths/register`     | Advanced Node register entry                        |
| `@unimolecule/monorepo-tsconfig-paths/loader`       | Low-level Node ESM loader integration               |
| `@unimolecule/monorepo-tsconfig-paths/core`         | Resolver primitives for custom adapters and tooling |
| `@unimolecule/monorepo-tsconfig-paths/package.json` | Package metadata                                    |

Prefer the wrapper commands unless another tool already owns process startup.
Use `register`, `loader`, or `core` only when you need to integrate with a custom
runner or debug a specific runtime chain.

## Resolution Model

For every non-relative alias candidate, the resolver:

1. Reads the importer from the parent module URL.
2. Finds the nearest package root for that importer.
3. Loads that package's configured `tsconfig`.
4. Resolves `extends`, including JSONC `tsconfig` files.
5. Applies that package's `baseUrl` and `paths`.
6. Probes TypeScript and JavaScript file candidates.
7. Returns a file URL when a candidate exists, or lets the next resolver handle
   the specifier.

Relative imports, absolute paths, Node builtins, URL imports, and normal package
imports are left to the host runtime.

## Configuration

The default mode expects a `tsconfig.json` in each package that uses runtime path
aliases.

Opt out a package in its `package.json`:

```json
{
  "monorepoTsconfigPaths": false
}
```

Point a package at a different `tsconfig`:

```json
{
  "monorepoTsconfigPaths": {
    "tsconfig": "tsconfig.node.json"
  }
}
```

The resolver is designed around nearest-package discovery by default. A future
workspace-level config can centralize options such as discovery mode, config file
names, extension probing, and debug output.

## Usage

### Run a tsx script

```sh
cd apps/server
mrp tsx ../../scripts/inspect-env.ts
```

When that script imports a workspace package, aliases inside the dependency are
resolved from the dependency package's `tsconfig`, not from `apps/server`.
This wrapper uses Node with `--import tsx` instead of the tsx CLI process, which
keeps the runtime hook chain smaller for long-running scripts.

### Load a Vite config

```sh
mrp vite build
```

This targets Vite's config-loading phase: Node loads `vite.config.ts` and any
direct config dependencies before Vite plugins participate in the application
module graph.

### Use Node directly

```sh
mrp node --import tsx/esm ./vite.config.ts
```

Use this when there is no first-class adapter for a runtime command. The wrapper
injects the resolver with known ordering, then leaves tool-specific behavior to
Node and the flags you provide.

### Advanced register usage

```sh
node \
  --import @unimolecule/monorepo-tsconfig-paths/register \
  --import tsx/esm \
  ./vite.config.ts
```

This form is useful for tools that already provide their own command wrapper.
It is more fragile than `mrp` because loader order and conflicting cwd-based path
resolution are now the caller's responsibility.

## Runtime Notes

- Node.js `>=22.15.0` is required because the register entry uses
  `module.registerHooks()`.
- The primary target is Node-driven ESM startup and config-loading workflows.
- `mrp tsx` and `mrp vite` are separate adapters because tsx execution and Vite
  config loading have different resolver timing.
- Vite plugin resolution for the application module graph is separate from Vite
  config loading.
- The register entry is idempotent and can be deregistered through the exported
  `registerMonorepoTsconfigPaths()` handle when a long-lived process needs to
  tear down hooks.
- Core resolver caches are bounded and can be cleared with `clearResolverCache()`
  when a tool rewrites package `tsconfig` files or generated files in-process.
- File probes use a short TTL so Vite dev, Astro, TanStack Start, and other
  Vite-based SSR/dev servers can discover generated files after an earlier miss
  without growing unbounded caches.
- Vitest/Jest adapters, Webpack/Rolldown adapters, Bun, and Yarn Plug'n'Play are
  not assumed by the base documentation.
- Performance depends on cached package root discovery, parsed `tsconfig`
  contents, and path matchers; watch-mode invalidation may need runtime-specific
  adapter work.

## Gotchas

- If another loader resolves an alias first, this resolver may not get a chance
  to correct it. Use `mrp` when deterministic ordering matters.
- `TSX_TSCONFIG_PATH` pointing at one package `tsconfig` repeats the original
  monorepo problem; it does not make repeated aliases importer-aware.
- `vite-tsconfig-paths` helps Vite's module graph, but it cannot fix imports
  that fail while Node is still loading `vite.config.ts`.
- `tsc-alias` rewrites emitted files; this package resolves runtime imports and
  does not rewrite source or build output.
