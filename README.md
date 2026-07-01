# Unimolecule Core

<p><strong>English</strong> | <a href="./README.zh-CN.md">Chinese</a></p>

`@unimolecule/core` is a pnpm monorepo for shared TypeScript packages and
documentation assets maintained by Unimolecule. The repository keeps reusable
runtime-neutral utilities, HTTP contract primitives, a Fetch client, and a
monorepo-aware tsconfig paths runtime resolver in separate package boundaries so
applications can compose only the pieces they need.

It is organized as a private workspace. Reusable libraries live under
`packages/`, documentation content lives under `apps/`, and root scripts
coordinate build, test, lint, formatting, cleanup, and Changesets release
metadata.

## Workspace

### Apps

These workspaces are private repository entry points or documentation targets.

| Package                                    | Version | Description                                            |
| ------------------------------------------ | ------- | ------------------------------------------------------ |
| [`@unimolecule/document`](./apps/document) | `0.0.1` | Documentation content workspace for published changes. |

### Shared Packages

These packages provide reusable TypeScript building blocks.

| Package                                                                             | Version | Description                                                                  |
| ----------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| [`@unimolecule/utils`](./packages/utils#readme)                                     | `0.1.2` | Runtime-neutral utilities plus explicit browser and Node helper entrypoints. |
| [`@unimolecule/canon`](./packages/canon#readme)                                     | `0.1.3` | Shared contract primitives for HTTP status, response, error, and pagination. |
| [`@unimolecule/oh-my-fetch`](./packages/oh-my-fetch#readme)                         | `0.1.3` | Fetch client built on `ky` with explicit plugins and subpath entrypoints.    |
| [`@unimolecule/monorepo-tsconfig-paths`](./packages/monorepo-tsconfig-paths#readme) | `0.0.0` | Runtime resolver and wrapper CLI for monorepo-aware TypeScript path aliases. |

## Architecture

The dependency direction is intentionally one-way:

```text
@unimolecule/utils
  -> @unimolecule/canon
  -> @unimolecule/oh-my-fetch
  -> apps / downstream application code

@unimolecule/monorepo-tsconfig-paths
  -> @unimolecule/utils
  -> runtime wrappers / downstream tool commands
```

`@unimolecule/utils` owns small runtime-neutral helpers and explicit
runtime-specific subpaths. `@unimolecule/canon` owns shared contract primitives
without schema-library or framework adapters. `@unimolecule/oh-my-fetch`
consumes those primitives where useful while keeping outbound request behavior,
validation adapters, error normalization, JSON security, dedupe, and plugins in
the client package. `@unimolecule/monorepo-tsconfig-paths` owns importer-aware
runtime path alias resolution and wrapper surfaces without changing application
source imports.

## Local Development

### Requirements

- Node.js `26.2.0`, as declared in [`pnpm-workspace.yaml`](./pnpm-workspace.yaml).
- pnpm `>=11.0.0`, as declared in [`package.json`](./package.json).

Install dependencies:

```bash
pnpm install
```

## Development

Root scripts coordinate workspace-level development, quality checks, releases,
and cleanup.

| Command                    | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `pnpm build`               | Build all workspace packages with build scripts. |
| `pnpm test`                | Run all workspace package test scripts.          |
| `pnpm lint`                | Run all workspace package lint scripts.          |
| `pnpm format`              | Format all workspace packages.                   |
| `pnpm clean`               | Run workspace and root cache cleanup.            |
| `pnpm commit`              | Start the Commitizen commit prompt.              |
| `pnpm changeset:generate`  | Create a Changesets entry.                       |
| `pnpm changeset:changelog` | Regenerate project and documentation changelogs. |
| `pnpm changeset:version`   | Version packages and regenerate changelogs.      |
| `pnpm changeset:publish`   | Publish versioned packages with Changesets.      |

Prefer package-scoped commands for focused work:

```bash
pnpm -F @unimolecule/utils test
pnpm -F @unimolecule/canon build
pnpm -F @unimolecule/oh-my-fetch test
pnpm -F @unimolecule/monorepo-tsconfig-paths typecheck
```

## Documentation

Root README content stays navigational and architectural. Package-specific API
details belong in the package README:

- [`packages/utils/README.md`](./packages/utils/README.md)
- [`packages/canon/README.md`](./packages/canon/README.md)
- [`packages/oh-my-fetch/README.md`](./packages/oh-my-fetch/README.md)
- [`packages/monorepo-tsconfig-paths/README.md`](./packages/monorepo-tsconfig-paths/README.md)

When package behavior changes, keep the English and Chinese README variants
aligned.

## Release Notes

The root changelog is [`CHANGELOG.md`](./CHANGELOG.md). The documentation app
also keeps a changelog page at
[`apps/document/content/changelog.md`](./apps/document/content/changelog.md).
Run `pnpm changeset:changelog` after release-plan changes to keep both targets
in sync.

## License

MIT
