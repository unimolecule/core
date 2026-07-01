# @unimolecule/monorepo-tsconfig-paths

<p><a href="./README.md">English</a> | <strong>中文</strong></p>

## WIP 状态

这个包仍是 **WIP**。现代 monorepo 的 runtime `tsconfig` alias resolution
牵涉很多变量：Node loader 顺序、`tsx`、Vite-based SSR 工具、source-mode
package exports、workspace package barrels、generated files，以及长期运行的
dev server，都会影响正确性和内存行为。

对目前碰到这类问题的 monorepo，优先采用更简单的项目布局：只在 `apps/*`
下使用 `tsconfig` alias，避免在 `packages/*` 内使用 `tsconfig` alias。
Workspace packages 应该通过 package name 和明确的 package subpaths 被消费，
而不是通过私有 source alias 互相引用。这样 package 更接近它的发布/运行时形态，
也能避免 loader-specific source-mode 意外。

`@unimolecule/monorepo-tsconfig-paths` 用 importing file 所在的 package 上下文，在 monorepo 运行时解析 TypeScript `compilerOptions.paths`，而不是依赖 `process.cwd()`。它适用于多个 package 复用同一个 alias 的 workspace，例如每个 package 都有自己的 `@/*`，并且运行时必须解析到 importer 所属 package。

## 设计

- Wrapper-first CLI：通过 `mrp tsx`、`mrp vite`、`mrp node` 或 `mrp debug` 运行，让 resolver 控制 loader 顺序。
- Importer-aware resolution：先找到 importing file 所属 package，再读取该 package 的 `tsconfig`。
- Runtime-only behavior：为 Node 驱动的运行时链路解析 alias，不重写 source files 或 emitted files。
- Advanced hooks：暴露 register、loader 和 core resolver surfaces，供已经拥有 process wrapper 的工具接入。
- Diagnostics：解释某个 specifier 是由哪个 package root、`tsconfig`、path pattern 和 candidate file 处理的。

这个包不替代 TypeScript、Vite、tsx、ts-node 或 bundler plugin。它的核心职责是让 monorepo 中重复 alias 在 runtime startup 和 config loading 阶段保持确定性。

## 为什么优先使用 Wrapper

单项目 path resolver 通常只加载一个 `tsconfig`，而且经常来自当前工作目录。当不同 package 复用同一个 alias 时，这会出问题：

```text
apps/server/tsconfig.json      @/* -> apps/server/src/*
packages/envs/tsconfig.json    @/* -> packages/envs/src/*
```

如果 `packages/envs/src/configs/redis.ts` import `@/constants`，正确目标应该是 `packages/envs/src/constants`，即使进程是从 `apps/server` 启动的。

推荐使用 wrapper，是因为 resolver composition order 会影响正确性。Wrapper 可以在 runner 应用 cwd-based path handling 前注册 monorepo-aware resolver，转发 argv 和 stdio，保留 exit code，并输出可诊断的 debug 信息。

## 快速开始

在运行工具命令的 workspace 中安装为开发依赖：

```sh
pnpm add -D @unimolecule/monorepo-tsconfig-paths
```

常见运行时命令使用 `mrp` wrapper：

```sh
mrp tsx ./scripts/inspect-env.ts
mrp vite build
mrp node --import tsx/esm ./vite.config.ts
```

从具体文件调试一个 import：

```sh
mrp debug resolve "@/constants" \
  --from packages/envs/src/configs/redis.ts
```

示例输出：

```text
specifier: @/constants
importer: packages/envs/src/configs/redis.ts
package root: packages/envs
tsconfig: packages/envs/tsconfig.json
matched path: @/*
candidate: packages/envs/src/constants/index.ts
result: resolved
```

## 入口

| Surface                                             | 用途                                             |
| --------------------------------------------------- | ------------------------------------------------ |
| `mrp tsx <file> [args...]`                          | 通过 Node 和 `tsx` import 运行 TypeScript 文件   |
| `mrp vite [vite args...]`                           | 安全加载 Vite config 及其 config dependencies    |
| `mrp node [node args...]`                           | 运行 Node，并优先注入 resolver                   |
| `mrp debug resolve <specifier> --from <file>`       | 查看某个 import 由哪个 package `tsconfig` 处理   |
| `@unimolecule/monorepo-tsconfig-paths/register`     | Advanced Node register entry                     |
| `@unimolecule/monorepo-tsconfig-paths/loader`       | Low-level Node ESM loader integration            |
| `@unimolecule/monorepo-tsconfig-paths/core`         | 给 custom adapter 和 tooling 使用的 resolver API |
| `@unimolecule/monorepo-tsconfig-paths/package.json` | Package metadata                                 |

除非另一个工具已经拥有 process startup，否则优先使用 wrapper 命令。只有在接入 custom runner 或调试特定 runtime chain 时，才使用 `register`、`loader` 或 `core`。

## Resolution Model

对每个可能是 alias 的非 relative specifier，resolver 会：

1. 从 parent module URL 读取 importer。
2. 找到 importer 最近的 package root。
3. 加载该 package 配置的 `tsconfig`。
4. 解析 `extends`，包括 JSONC `tsconfig` 文件。
5. 应用该 package 的 `baseUrl` 和 `paths`。
6. 探测 TypeScript 和 JavaScript file candidates。
7. candidate 存在时返回 file URL；否则交给下一个 resolver 处理。

Relative imports、absolute paths、Node builtins、URL imports 和普通 package imports 都交给宿主 runtime 处理。

## 配置

默认模式期望每个使用 runtime path alias 的 package 都有一个 `tsconfig.json`。

在 package 的 `package.json` 中关闭解析：

```json
{
  "monorepoTsconfigPaths": false
}
```

把某个 package 指向不同的 `tsconfig`：

```json
{
  "monorepoTsconfigPaths": {
    "tsconfig": "tsconfig.node.json"
  }
}
```

Resolver 默认围绕 nearest-package discovery 设计。后续 workspace-level config 可以集中配置 discovery mode、config file names、extension probing 和 debug output。

## 用法

### 运行 tsx script

```sh
cd apps/server
mrp tsx ../../scripts/inspect-env.ts
```

当这个 script import workspace package 时，dependency 内部的 alias 会使用 dependency package 的 `tsconfig` 解析，而不是 `apps/server` 的 `tsconfig`。
这个 wrapper 使用 Node 搭配 `--import tsx`，而不是 tsx CLI process；对长时间运行的 script 来说，runtime hook chain 更小。

### 加载 Vite config

```sh
mrp vite build
```

这针对的是 Vite 的 config-loading phase：Node 会先加载 `vite.config.ts` 及其直接 config dependencies，然后 Vite plugin 才会参与 application module graph。

### 直接使用 Node

```sh
mrp node --import tsx/esm ./vite.config.ts
```

当某个 runtime command 没有 first-class adapter 时使用这个入口。Wrapper 会用确定顺序注入 resolver，然后把 tool-specific behavior 交给 Node 和你传入的 flags。

### Advanced register 用法

```sh
node \
  --import @unimolecule/monorepo-tsconfig-paths/register \
  --import tsx/esm \
  ./vite.config.ts
```

这种方式适合已经自带 command wrapper 的工具。它比 `mrp` 更脆弱，因为 loader order 和冲突的 cwd-based path resolution 需要调用方自己负责。

## 运行时说明

- 要求 Node.js `>=22.15.0`，因为 register 入口使用
  `module.registerHooks()`。
- 主要目标是 Node 驱动的 ESM startup 和 config-loading workflows。
- `mrp tsx` 与 `mrp vite` 是独立 adapter，因为 tsx execution 与 Vite config loading 的 resolver timing 不同。
- Vite application module graph 的 plugin resolution 与 Vite config loading 是两个阶段。
- register 入口是幂等的；长进程需要 teardown hooks 时，可以使用导出的
  `registerMonorepoTsconfigPaths()` 返回句柄注销。
- Core resolver 缓存是有上限的；当工具在同一个进程内重写 package
  `tsconfig` 或 generated files 时，可以调用 `clearResolverCache()` 清理。
- File probe 使用短 TTL；Vite dev、Astro、TanStack Start 和其他 Vite-based
  SSR/dev server 在某次 miss 后生成文件，也能在缓存过期后重新发现文件，同时缓存不会无界增长。
- 基础文档不假设 Vitest/Jest adapter、Webpack/Rolldown adapter、Bun 或 Yarn Plug'n'Play 支持。
- 性能依赖 package root discovery、parsed `tsconfig` 和 path matcher 的缓存；watch-mode invalidation 可能需要 runtime-specific adapter 继续处理。

## 易踩坑

- 如果其他 loader 先解析了 alias，这个 resolver 可能没有机会修正。需要确定性顺序时请使用 `mrp`。
- `TSX_TSCONFIG_PATH` 指向某一个 package `tsconfig` 会重复原来的 monorepo 问题；它不会让重复 alias 变成 importer-aware。
- `vite-tsconfig-paths` 可以帮助 Vite module graph，但不能修复 Node 加载 `vite.config.ts` 时已经失败的 imports。
- `tsc-alias` 会重写 emitted files；这个包解析 runtime imports，不重写 source 或 build output。
