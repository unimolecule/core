# Unimolecule Core

<p><a href="./README.md">English</a> | <strong>Chinese</strong></p>

`@unimolecule/core` 是 Unimolecule 维护的 pnpm monorepo，用于放置共享
TypeScript packages 和文档资产。这个仓库把运行时无关的工具函数、HTTP 契约原语、
Fetch client，以及 monorepo-aware 的 tsconfig paths 运行时 resolver 放在不同包边界中，
让应用可以按需组合依赖。

仓库本身是 private workspace。可复用库位于 `packages/`，文档内容位于 `apps/`，
根脚本负责协调 build、test、lint、format、cleanup 和 Changesets release metadata。

## Workspace

### Apps

这些 workspace 是私有仓库入口或文档目标。

| Package                                    | Version | Description                            |
| ------------------------------------------ | ------- | -------------------------------------- |
| [`@unimolecule/document`](./apps/document) | `0.0.1` | 用于发布变更记录的文档内容 workspace。 |

### Shared Packages

这些 packages 提供可复用的 TypeScript building blocks。

| Package                                                                             | Version | Description                                                              |
| ----------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| [`@unimolecule/utils`](./packages/utils#readme)                                     | `0.1.2` | 运行时无关工具函数，并提供明确的 browser 和 Node helper entrypoints。    |
| [`@unimolecule/canon`](./packages/canon#readme)                                     | `0.1.3` | HTTP status、response、error 和 pagination 的共享契约原语。              |
| [`@unimolecule/oh-my-fetch`](./packages/oh-my-fetch#readme)                         | `0.1.3` | 基于 `ky` 的 Fetch client，提供显式 plugins 和 subpath entrypoints。     |
| [`@unimolecule/monorepo-tsconfig-paths`](./packages/monorepo-tsconfig-paths#readme) | `0.0.0` | 面向 monorepo TypeScript path alias 的 runtime resolver 和 wrapper CLI。 |

## Architecture

依赖方向刻意保持单向：

```text
@unimolecule/utils
  -> @unimolecule/canon
  -> @unimolecule/oh-my-fetch
  -> apps / downstream application code

@unimolecule/monorepo-tsconfig-paths
  -> @unimolecule/utils
  -> runtime wrappers / downstream tool commands
```

`@unimolecule/utils` 拥有小型运行时无关 helpers 和明确的运行时 subpaths。
`@unimolecule/canon` 拥有共享契约原语，不包含 schema-library 或 framework adapters。
`@unimolecule/oh-my-fetch` 会在合适位置消费这些原语，同时把 outbound request behavior、
validation adapters、error normalization、JSON security、dedupe 和 plugins 留在 client package。
`@unimolecule/monorepo-tsconfig-paths` 拥有 importer-aware 的运行时 path alias resolution
和 wrapper surfaces，不改写应用源码 imports。

## Local Development

### Requirements

- Node.js `26.2.0`，见 [`pnpm-workspace.yaml`](./pnpm-workspace.yaml)。
- pnpm `>=11.0.0`，见 [`package.json`](./package.json)。

安装依赖：

```bash
pnpm install
```

## Development

根脚本用于协调 workspace 级开发、质量检查、release 和 cleanup。

| Command                    | Description                                   |
| -------------------------- | --------------------------------------------- |
| `pnpm build`               | 构建所有带 build 脚本的 workspace packages。  |
| `pnpm test`                | 运行所有 workspace package test scripts。     |
| `pnpm lint`                | 运行所有 workspace package lint scripts。     |
| `pnpm format`              | 格式化所有 workspace packages。               |
| `pnpm clean`               | 执行 workspace 和 root cache cleanup。        |
| `pnpm commit`              | 启动 Commitizen commit prompt。               |
| `pnpm changeset:generate`  | 创建 Changesets entry。                       |
| `pnpm changeset:changelog` | 重新生成 project 和 documentation changelog。 |
| `pnpm changeset:version`   | version packages 并重新生成 changelog。       |
| `pnpm changeset:publish`   | 通过 Changesets 发布已 version 的 packages。  |

做聚焦改动时优先使用 package-scoped commands：

```bash
pnpm -F @unimolecule/utils test
pnpm -F @unimolecule/canon build
pnpm -F @unimolecule/oh-my-fetch test
pnpm -F @unimolecule/monorepo-tsconfig-paths typecheck
```

## Documentation

Root README 保持导航和架构说明。Package-specific API 细节放在各 package README 中：

- [`packages/utils/README.md`](./packages/utils/README.md)
- [`packages/canon/README.md`](./packages/canon/README.md)
- [`packages/oh-my-fetch/README.md`](./packages/oh-my-fetch/README.md)
- [`packages/monorepo-tsconfig-paths/README.md`](./packages/monorepo-tsconfig-paths/README.md)

Package 行为变化时，保持英文和中文 README variants 结构与事实一致。

## Release Notes

根 changelog 是 [`CHANGELOG.md`](./CHANGELOG.md)。文档应用也在
[`apps/document/content/changelog.md`](./apps/document/content/changelog.md)
维护 changelog 页面。Release plan 变化后运行 `pnpm changeset:changelog`，
让两个目标保持同步。

## License

MIT
