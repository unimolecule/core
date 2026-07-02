# @unimolecule/utils/node

<p><a href="./README.md">English</a> | <strong>中文</strong></p>

## 介绍

`@unimolecule/utils/node` 提供一组面向 Node.js 运行时的小工具，主要服务于本 workspace 的进程运行时与脚本。它覆盖文件系统探测、进程启动、monorepo 发现、本机网络地址读取，以及 graceful shutdown wiring。

这个入口保持 framework-neutral。它依赖 `child_process`、`fs`、`module`、`os`、`path`、`process` 等 Node built-ins，因此不要在浏览器或 Cloudflare Worker isolate 代码中导入。

## 设计

- 每个 helper 保持独立，导入成本低。
- 能显式传入参数时，优先避免隐藏的全局状态。
- 命令探测和进程启动避免字符串 shell 执行。
- 清理本入口自己创建的 timer 与 process listener。
- 保持公开命名稳定，方便 app runtime code 和脚本逐步迁移。

## 使用方式

检查命令是否可用：

```ts
import { appExists, appExistsSync } from "@unimolecule/utils/node";

const hasNode = appExistsSync(process.execPath, { args: ["--version"] });

async function main() {
  const hasShopify = await appExists("shopify");
  console.log({ hasNode, hasShopify });
}

main().catch(console.error);
```

使用跨平台 wrapper 启动命令：

```ts
import { unifiedSpawnAsync } from "@unimolecule/utils/node";

async function main() {
  const code = await unifiedSpawnAsync("pnpm", ["--version"], {
    stdio: "inherit",
  });
  console.log(code);
}

main().catch(console.error);
```

读取 workspace package metadata：

```ts
import { getPackages } from "@unimolecule/utils/node";

async function main() {
  const { packages } = await getPackages(process.cwd());
  const utilsPackage = packages.find(
    (pkg) => pkg.packageJson.name === "@unimolecule/utils",
  );
  console.log(utilsPackage);
}

main().catch(console.error);
```

注册进程退出清理：

```ts
import { createProcessGracefulExit } from "@unimolecule/utils/node";

const gracefulExit = createProcessGracefulExit(console);
const cleanup = gracefulExit.createCleanup(server, async () => {
  await disposeProviders();
});

gracefulExit.register(cleanup);
```

探测文件系统和格式化路径：

```ts
import {
  checkProcessDiskAccess,
  checkProcessDiskUsage,
  formatPath,
  getProcessDiskUsage,
  pathExists,
} from "@unimolecule/utils/node";

async function main() {
  await checkProcessDiskAccess(process.cwd());
  const disk = await getProcessDiskUsage({ path: process.cwd() });
  const diskCheck = await checkProcessDiskUsage({
    maxUsedPercent: 0.9,
    minAvailableBytes: 1024 * 1024 * 1024,
  });
  await pathExists("package.json");
  formatPath(String.raw`C:\Users\i7eo\app`);
  console.log({ disk, diskCheck });
}

main().catch(console.error);
```

检查进程内存使用：

```ts
import {
  checkProcessMemoryUsage,
  getProcessMemoryUsage,
} from "@unimolecule/utils/node";

const memory = getProcessMemoryUsage();
const memoryCheck = checkProcessMemoryUsage({
  maxHeapUsedBytes: 150 * 1024 * 1024,
  maxRssBytes: 512 * 1024 * 1024,
});

console.log({ memory, memoryCheck });
```

读取本机地址：

```ts
import { getLocalhostAddress } from "@unimolecule/utils/node";

const hosts = getLocalhostAddress();
console.log(hosts);
```

从源码目录生成 tsdown entries：

```ts
import { outputEntryBuilder } from "@unimolecule/utils/node/output-entry-builder";

export default {
  entry: outputEntryBuilder("./src", {
    entries: "index",
  }),
};
```

## API

| Export                                         | 说明                                                                   |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `appExists(app, options?)`                     | 异步探测 PATH 中是否存在可执行命令。                                   |
| `appExistsSync(app, options?)`                 | 同步探测 PATH 中是否存在可执行命令。                                   |
| `checkProcessDiskAccess(path?)`                | 验证路径读写权限，默认使用 `process.cwd()`。                           |
| `checkProcessDiskUsage(options?)`              | 读取磁盘使用情况，并返回使用率与可用字节阈值的结构化 `checks`。        |
| `checkProcessMemoryUsage(options?)`            | 读取进程内存使用情况，并按可选 heap/RSS 字节阈值判断。                 |
| `executeCommand(command, args?, options?)`     | 执行命令，成功时返回退出信息。                                         |
| `executeCommandSync(command, args?, options?)` | 同步命令执行器，行为与异步版本一致。                                   |
| `formatPath(path)`                             | 将反斜杠路径分隔符转换为 `/`，Unix 路径保持不变。                      |
| `createProcessGracefulExit(logger?)`           | 创建隔离的进程信号注册和 shutdown helper。                             |
| `exitSignals`                                  | 支持的 graceful shutdown 信号：`SIGINT`、`SIGQUIT`、`SIGTERM`。        |
| `getLocalhostAddress()`                        | 返回非 internal IPv4 地址和 `[::]`，并去重。                           |
| `getPackages(cwd?)`                            | 从 `@manypkg/get-packages` 直接导出的异步函数。                        |
| `getPackagesSync(cwd?)`                        | 从 `@manypkg/get-packages` 直接导出的同步函数。                        |
| `getProcessDiskUsage(options?)`                | 读取指定路径的文件系统容量、空闲、可用、已用字节和使用率。             |
| `getProcessMemoryUsage()`                      | 读取 `process.memoryUsage()`，并返回以字节命名的字段。                 |
| `outputEntryBuilder(rootDir, options?)`        | 扫描文件生成 tsdown entry 对象；`entries: "index"` 只保留 index 文件。 |
| `pathExists(path)`                             | 异步 `fs.access` 存在性检查。                                          |
| `pathExistsSync(path)`                         | 同步 `fs.accessSync` 存在性检查。                                      |
| `require`                                      | 给 ESM 模块使用的 `createRequire(import.meta.url)`。                   |
| `unifiedSpawn(command, args?, options?)`       | 跨平台 `spawn` wrapper。                                               |
| `unifiedSpawnAsync(command, args?, options?)`  | Promise wrapper，解析 child process close code。                       |
| `unifiedSpawnSync(command, args?, options?)`   | 跨平台 `spawnSync` wrapper。                                           |
| `userHome`                                     | 当前 `os.homedir()` 值。                                               |

## 运行时说明

- 这个入口只适用于 Node.js runtime。
- `appExists` 和 `unifiedSpawn` 在 Windows 上隐藏 child window，并且除非调用方显式要求，否则不分配 stdio。
- `createProcessGracefulExit` 只移除自己注册的 listener，所以可以和多个 controller 或外部 signal listener 共存。
- `getLocalhostAddress()` 是动态读取，每次调用都会读取 network interfaces。
