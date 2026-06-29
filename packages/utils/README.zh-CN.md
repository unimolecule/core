# @unimolecule/utils

<p><a href="./README.md">English</a> | <strong>中文</strong></p>

## 目录

- [介绍](#介绍)
- [设计与架构](#设计与架构)
- [输入与输出](#输入与输出)
- [使用方式](#使用方式)
- [运行时入口](#运行时入口)
- [运行时说明](#运行时说明)

## 介绍

`@unimolecule/utils` 是 workspace 的共享工具包。它提供一组小而聚焦的工具函数，覆盖 JSON 序列化、日期、字符串、运行时判断、类型守卫、树结构处理、随机值、crypto hash、sleep，以及常见 TypeScript 工具类型。浏览器运行时工具通过显式的 `@unimolecule/utils/web` 子路径提供，Node.js 运行时工具通过显式的 `@unimolecule/utils/node` 子路径提供。

## 设计与架构

`@unimolecule/utils` 的设计原则：

- 工具函数保持小而独立，不绑定具体框架。
- 能写成纯函数的逻辑优先保持纯函数。
- JSON 序列化边界统一放在 `json.ts`，其他包不要直接调用 `JSON.parse` / `JSON.stringify`。
- 公共入口避免强依赖 DOM 类型，让 Node、Workers、浏览器构建都能完成类型检查。
- Node-only helper 不从公共根入口导出，只能从 `@unimolecule/utils/node` 或 `@unimolecule/utils/node/*` 导入。
- Web-only helper 不从公共根入口导出，只能从 `@unimolecule/utils/web` 或 `@unimolecule/utils/web/*` 导入。
- 通过包入口统一 re-export 部分外部工具，例如 `es-toolkit`。
- crypto helper 基于 Web Crypto API，保持 Node 与 Workers 可复用。

`web/cookie.ts`、`web/raf.ts` 这类浏览器能力相关工具会基于 `globalThis` 做运行时检测。请通过显式的 web 入口导入它们，避免 shared code 意外依赖浏览器 API。

## 输入与输出

输入：

- primitive、object、array、date、JSON string、tree node、callback、cookie name/value 等。
- 可选配置对象，例如 cookie attributes、tree 字段映射、随机数生成选项。

输出：

- JSON 解析结果或序列化字符串。
- 格式化后的日期字符串。
- 类型守卫判断结果。
- 树遍历结果与转换后的树结构。
- 浏览器环境中的 cookie 字符串或 cookie 值。
- raf 调度工具返回的 cancel 函数。
- 常见类型转换所需的 TypeScript helper type。

## 使用方式

使用 JSON helper 作为共享序列化边界：

```ts
import { deserializeValue, serializeValue } from "@unimolecule/utils";

const raw = serializeValue({ id: "shop_1", enabled: true });
const parsed = deserializeValue<{ id: string; enabled: boolean }>(raw);
```

使用类型守卫过滤数组：

```ts
import { notNullish } from "@unimolecule/utils";

const values = ["a", null, "b", undefined].filter(notNullish);
// string[]
```

使用日期工具：

```ts
import { diffDays, formatToDateTime, previousDay } from "@unimolecule/utils";

formatToDateTime(new Date());
diffDays("2026-06-07", "2026-06-01");
previousDay("2026-06-07");
```

在浏览器环境中使用 cookie 工具：

```ts
import { Cookies, getCookieJSON, setCookieJSON } from "@unimolecule/utils/web";

Cookies.set("locale", "en-US", { sameSite: "lax" });
const locale = Cookies.get("locale");

setCookieJSON("settings", { density: "compact" });
const settings = getCookieJSON<{ density: string }>("settings");
```

使用树结构工具：

```ts
import { findNode, listToTree, traverseTree } from "@unimolecule/utils";

const tree = listToTree([
  { id: 1, pid: 0, name: "Root" },
  { id: 2, pid: 1, name: "Child" },
]);

const child = findNode<{ id: number; name: string }>(
  tree,
  (node) => node.id === 2,
);

const names = traverseTree(tree, (node: any) => ({
  match: true,
  result: node.name,
}));
```

使用 runtime-neutral 入口中的 timer 调度工具：

```ts
import { debounce, throttle } from "@unimolecule/utils";

const onSearch = debounce((value: string) => {
  console.log("search", value);
}, 200);

const onScroll = throttle(() => {
  console.log("scroll");
}, 100);

onSearch("query");
onScroll();
```

需要与浏览器帧对齐时，使用 raf 调度工具：

```ts
import { rafDebounce, rafThrottle } from "@unimolecule/utils/web";

const onResize = rafDebounce(() => {
  console.log("resize settled");
}, 200);

const onFrameScroll = rafThrottle(() => {
  console.log("frame scroll");
}, 100);

onResize.cancel();
onFrameScroll.cancel();
```

使用 Web Crypto helper：

```ts
import { sha256Hex } from "@unimolecule/utils";

async function main() {
  const digest = await sha256Hex("secret-token");
  console.log(digest);
}

main().catch(console.error);
```

## 运行时入口

运行时专属 helper 不从包根入口导出。代码依赖浏览器或 Node.js 平台 API 时，请使用对应的专属入口。

| 入口                        | 范围                                               | 参考                                                   |
| --------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| `@unimolecule/utils/web`    | 浏览器 helper，例如 cookie 和 raf 驱动的调度工具。 | [src/web/README.zh-CN.md](./src/web/README.zh-CN.md)   |
| `@unimolecule/utils/node`   | Node.js helper，例如文件系统探测和进程启动。       | [src/node/README.zh-CN.md](./src/node/README.zh-CN.md) |
| `@unimolecule/utils/web/*`  | 单个浏览器 helper 模块的直接导入。                 | [src/web](./src/web)                                   |
| `@unimolecule/utils/node/*` | 单个 Node.js helper 模块的直接导入。               | [src/node](./src/node)                                 |

## 运行时说明

`@unimolecule/utils` 目标是能被 shared code 使用，但部分工具仍依赖特定运行时能力：

- Cookie 工具需要浏览器式 `document.cookie`；在非浏览器环境中会返回空值或 no-op。
- raf 工具优先使用 `requestAnimationFrame`，不存在时退化为 `setTimeout`。
- `@unimolecule/utils/web` 是浏览器侧入口，测试使用 jsdom。
- `sha256Hex` 使用 `crypto.subtle.digest`，宿主 runtime 需要提供 Web Crypto。
- `@unimolecule/utils/node` 是 Node-only 入口，依赖 `child_process`、`fs`、`module`、`os`、`path`、`process` 等 Node built-ins。
- JSON helper 与运行时无关，workspace 内其他包应优先使用它们，而不是直接调用 `JSON.parse` / `JSON.stringify`。
