# Monorepo Runtime Paths Wrapper Plan

## Purpose

Build an open-source package that resolves TypeScript `compilerOptions.paths` at runtime in monorepos by using the importing file's package context, not `process.cwd`.

The package fills the gap between current single-project tools such as `tsconfig-paths` and real monorepo runtime workflows where many packages reuse the same local alias:

```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

In that setup, `@/*` means different directories depending on which package owns the importing file. Runtime tools that load only one tsconfig cannot resolve this safely.

## Target Fixture

Use this failure chain as the first fixture:

```text
apps/web/vite.config.ts
  -> @shamt/app-env
  -> @shamt/envs
  -> packages/envs/src/configs/redis.ts
  -> import "@/constants"
```

Expected behavior:

```text
packages/envs/src/configs/redis.ts imports "@/constants"
=> resolve with packages/envs/tsconfig.json
=> packages/envs/src/constants/index.ts
```

It must not resolve with:

```text
apps/web/tsconfig.json
apps/server/tsconfig.json
process.cwd()
```

## Non-goals

- Do not replace TypeScript, Vite, tsx, ts-node, or `tsconfig-paths`.
- Do not require packages to change source imports to relative paths.
- Do not require packages to use Node `package.json#imports` aliases such as `#src/*`.
- Do not solve every runner in the first release.
- Do not support CommonJS require hooks in the MVP unless the ESM path is already stable.
- Do not rewrite source files or emitted files in the MVP.

## Why Wrapper Mode

The default user experience should be a wrapper, not a raw `--import` loader.

Recommended UX:

```sh
mrp tsx ./scripts/foo.ts
mrp vite build
mrp node --import tsx/esm ./vite.config.ts
```

Advanced UX:

```sh
node --import @pkg/register --import tsx/esm ./vite.config.ts
```

Wrapper mode is necessary because resolver composition order is part of correctness.

When a user starts from `apps/server`, `tsx` may eagerly apply the server tsconfig paths before a custom loader gets the chance to resolve `@/constants` from a dependency package. That can misresolve:

```text
packages/envs/src/configs/redis.ts imports "@/constants"
process cwd is apps/server
tsx sees apps/server/tsconfig.json
@/constants becomes apps/server/src/constants
```

A plain loader cannot reliably prevent this if the user controls loader order or if another loader resolves first. The wrapper can own the full process shape:

- choose the runtime adapter;
- register the monorepo-aware resolver first;
- launch `tsx`, Vite, or Node with known flags;
- neutralize conflicting cwd-based path resolution when needed;
- forward argv, env, stdio, signals, and exit codes;
- provide debug output that explains which tsconfig handled a specifier.

In short, wrapper mode is not just convenience. It is the boundary that makes resolution deterministic.

## Should Users Keep `--import`?

Users should not need to write `--import` for the common path.

The package should still expose a register entry because it is useful for advanced integration, debugging, and tools that already own their command wrapper.

Recommended public surfaces:

```text
@pkg/cli       wrapper commands
@pkg/register  advanced Node register entry
@pkg/loader    low-level Node ESM loader
@pkg/core      resolver primitives
```

Policy:

- Wrapper mode is the documented primary path.
- `--import @pkg/register` is supported but documented as advanced mode.
- The wrapper may internally use `--import @pkg/register`.
- `--import` is not removed because it is the lowest-friction bridge into Node's loader lifecycle.
- `--import` alone is not enough to guarantee correctness with tools that already implement tsconfig paths.

## Architecture

Keep the core resolver independent from every runtime adapter.

Suggested package layout in `@unimolecule/core`:

```text
packages/monorepo-runtime-paths/
  src/
    core/
      config.ts
      discovery.ts
      matcher.ts
      resolver.ts
      types.ts
    node/
      loader.ts
      register.ts
    adapters/
      tsx.ts
      vite.ts
      node.ts
    cli/
      index.ts
      parse.ts
      run.ts
    diagnostics/
      debug.ts
      errors.ts
  tests/
    fixtures/
      pnpm-workspace/
      vite-config-chain/
      repeated-at-alias/
```

The source structure should stay split even if the first publish is a single npm package.

## Core Resolver

Responsibilities:

- Find the importer file from `parentURL`.
- Find the nearest package root for that importer.
- Load that package's tsconfig.
- Resolve `extends`, including package-based extends.
- Parse JSONC.
- Read `baseUrl` and `paths`.
- Apply TypeScript path matching rules.
- Probe candidate files with Node/tsx-friendly extensions.
- Cache package roots, tsconfig contents, and path matchers.
- Return either a resolved file URL or "not handled".

Pseudo-flow:

```text
resolve(specifier, parentURL)
  if specifier is relative, absolute, node builtin, URL, or package import:
    return not handled

  importerPath = fileURLToPath(parentURL)
  packageRoot = findNearestPackageJson(importerPath)
  project = findProjectConfig(packageRoot, importerPath)
  matcher = getMatcher(project)
  candidates = matcher(specifier)

  for each candidate:
    if candidate exists:
      return file URL

  return not handled
```

Project discovery modes:

```ts
type ProjectDiscovery =
  "nearest-package" | "nearest-tsconfig" | "workspace-index";
```

MVP should default to `nearest-package`.

## TSX Adapter

The tsx adapter must be written separately from the Vite adapter.

Command:

```sh
mrp tsx ./scripts/foo.ts
```

Responsibilities:

- Spawn Node or tsx with the monorepo resolver active.
- Preserve tsx behavior for TypeScript transformation.
- Avoid letting tsx's cwd-based paths resolver win before the monorepo resolver.
- Forward watch mode flags when supported.
- Forward stdin/stdout/stderr.
- Forward signals.
- Preserve child exit code.

Important design point:

The adapter should not depend on `TSX_TSCONFIG_PATH` pointing at a real package tsconfig. That repeats the original problem.

If tsx's own path resolver conflicts, the adapter can create a temporary synthetic tsconfig for tsx that preserves syntax transform options but strips runtime resolution fields such as `baseUrl` and `paths`. Then this package's resolver is the single owner of runtime path alias resolution.

This must be validated with a fixture where:

```text
apps/server/tsconfig.json has @/* -> apps/server/src/*
packages/envs/tsconfig.json has @/* -> packages/envs/src/*
script cwd is apps/server
importer is packages/envs/src/configs/redis.ts
```

Expected result:

```text
@/constants resolves to packages/envs/src/constants
```

## Vite Adapter

The Vite adapter must be written separately from the tsx adapter.

Command:

```sh
mrp vite build
mrp vite dev
```

Responsibilities:

- Launch Vite with the monorepo resolver active before `vite.config.ts` loads.
- Handle the Vite config loading phase, because Vite plugins are not available yet.
- Preserve Vite's own module graph behavior after config load.
- Avoid forcing users to add `vite-tsconfig-paths` for the config-loading problem.

Scope boundary:

- MVP focuses on Vite config loading and direct config dependencies.
- Vite application source graph support can be added later as a Vite plugin or adapter option.

Why this split matters:

Vite has two different resolution phases:

```text
1. Node loads vite.config.ts and its dependencies.
2. Vite builds the application module graph with plugins.
```

The reported failure happens in phase 1. A normal Vite plugin only participates in phase 2, so a Vite-only plugin is not enough.

## Node Adapter

Command:

```sh
mrp node --import tsx/esm ./vite.config.ts
```

Responsibilities:

- Provide a generic Node wrapper for advanced users.
- Inject the resolver with known ordering.
- Leave runtime-specific behavior to the caller.
- Serve as a fallback for tools without a first-class adapter.

This adapter is useful, but it should not be the main recommended UX for tsx or Vite.

## CLI Design

Initial commands:

```sh
mrp tsx [tsx args...]
mrp vite [vite args...]
mrp node [node args...]
mrp debug resolve <specifier> --from <file>
```

Optional aliases:

```sh
monorepo-paths tsx ./script.ts
monorepo-paths vite build
```

Debug command example:

```sh
mrp debug resolve "@/constants" \
  --from packages/envs/src/configs/redis.ts
```

Debug output:

```text
specifier: @/constants
importer: packages/envs/src/configs/redis.ts
package root: packages/envs
tsconfig: packages/envs/tsconfig.json
matched path: @/*
candidate: packages/envs/src/constants/index.ts
result: resolved
```

## Configuration

Default config should work without a config file.

Optional config file:

```ts
// monorepo-runtime-paths.config.ts
export default {
  projectDiscovery: "nearest-package",
  configNames: ["tsconfig.json"],
  extensions: [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".json"],
  debug: false,
};
```

Package-level opt-out:

```json
{
  "monorepoTsconfigPaths": false
}
```

Package-level override:

```json
{
  "monorepoTsconfigPaths": {
    "tsconfig": "tsconfig.node.json"
  }
}
```

## Compatibility Matrix

MVP:

```text
Node ESM loader: yes
tsx direct execution: yes
Vite config loading: yes
pnpm workspace: yes
JSONC tsconfig: yes
tsconfig extends: yes
repeated @/* aliases per package: yes
```

Later:

```text
CommonJS require hook
Vitest adapter
ts-node adapter
Jest adapter
Webpack adapter
Rolldown adapter
Bun support
Yarn PnP support
```

## Test Fixtures

Fixture 1: repeated alias across packages

```text
apps/server
  tsconfig.json: @/* -> src/*
  src/constants.ts

packages/envs
  tsconfig.json: @/* -> src/*
  src/constants/index.ts
  src/configs/redis.ts imports "@/constants"
```

Run from `apps/server`.

Expected:

```text
@/constants resolves to packages/envs/src/constants/index.ts
```

Fixture 2: Vite config chain

```text
apps/web/vite.config.ts imports @workspace/app-env
packages/app-env imports @workspace/envs
packages/envs imports "@/constants"
```

Run:

```sh
mrp vite build
```

Expected:

```text
config loads
build starts
no cwd-based alias leak
```

Fixture 3: tsx script

```sh
cd apps/server
mrp tsx ../../scripts/inspect-env.ts
```

Expected:

```text
imports resolve by importer package
exit code is preserved
stdio is preserved
```

Fixture 4: debug command

```sh
mrp debug resolve "@/constants" --from packages/envs/src/configs/redis.ts
```

Expected:

```text
prints package root, tsconfig, matched pattern, candidate paths
```

## MVP Milestones

### Milestone 1: Core resolver

- Implement package root discovery.
- Implement tsconfig discovery.
- Implement JSONC parsing.
- Implement `extends` resolution.
- Implement `baseUrl` and `paths` matching.
- Implement candidate probing.
- Add fixture tests for repeated `@/*`.

### Milestone 2: Node loader and register entry

- Implement ESM `resolve` hook.
- Add `@pkg/register`.
- Add debug logging.
- Verify direct Node + tsx/esm usage.

### Milestone 3: TSX adapter

- Implement `mrp tsx`.
- Verify adapter with conflicting cwd paths.
- Decide whether to generate a synthetic tsx tsconfig to strip cwd `paths`.
- Preserve watch mode, stdio, signals, and exit code.

### Milestone 4: Vite adapter

- Implement `mrp vite`.
- Verify Vite config loading fixture.
- Keep Vite module graph support out of MVP unless needed by fixture.

### Milestone 5: Documentation

- Explain why wrapper mode is primary.
- Explain why `--import` remains advanced mode.
- Compare with `tsconfig-paths`, `vite-tsconfig-paths`, and `tsc-alias`.
- Provide migration examples for pnpm workspaces.

## Risks

### Loader ordering

Other loaders can resolve before this resolver. Wrapper mode reduces this risk by controlling the process shape.

### TSX internal behavior

tsx may apply cwd-based tsconfig paths. The tsx adapter must validate and, if needed, neutralize tsx path alias behavior so this resolver owns runtime alias resolution.

### Vite phase confusion

Vite config loading and Vite module graph loading are different phases. The MVP should solve config loading first.

### Performance

Naive tsconfig discovery on every import can be slow. Cache package roots, parsed configs, and matchers. In watch mode, add invalidation later.

### Overpromising

The package should not claim universal runtime support in v1. Start with Node ESM, tsx, and Vite config loading.

## Acceptance Criteria

The MVP is successful when all of these pass:

```sh
cd fixtures/repeated-at-alias/apps/server
mrp tsx ./script.ts

cd fixtures/vite-config-chain/apps/web
mrp vite build

mrp debug resolve "@/constants" \
  --from fixtures/repeated-at-alias/packages/envs/src/configs/redis.ts
```

And the debug output proves:

```text
specifier resolved using the importer package tsconfig
not process.cwd
not the root tsconfig
not the consuming app tsconfig
```

## Recommended First Implementation Target

Create the package in `@unimolecule/core` as a focused utility package, probably under:

```text
packages/monorepo-runtime-paths
```

Use the current Shopify Hono app failure as a copied fixture, but keep the library generic.

Do not start by changing production app imports. Build the resolver package first, then decide whether consumers should use:

```sh
mrp vite build
```

or:

```sh
node --import @pkg/register --import tsx/esm ./node_modules/vite/bin/vite.js build
```

The recommended public path should stay wrapper-first.
