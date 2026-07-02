# @unimolecule/utils/node

<p><strong>English</strong> | <a href="./README.zh-CN.md">中文</a></p>

## Overview

`@unimolecule/utils/node` contains small Node.js runtime helpers used by this workspace's process runtime and scripts. It focuses on filesystem probes, process spawning, monorepo discovery, local network addresses, and graceful shutdown wiring.

This entry is intentionally framework-neutral. It should not be imported by browser or Cloudflare Worker isolate code because it depends on Node built-ins such as `child_process`, `fs`, `module`, `os`, `path`, and `process`.

## Design

- Keep each helper independent and cheap to import.
- Prefer explicit input parameters over hidden global state when practical.
- Avoid string shell execution for command probes and spawning paths.
- Clean up timers and process listeners owned by this entry.
- Keep public names stable so app runtime code and scripts can migrate gradually from local copies.

## Usage

Check command availability:

```ts
import { appExists, appExistsSync } from "@unimolecule/utils/node";

const hasNode = appExistsSync(process.execPath, { args: ["--version"] });

async function main() {
  const hasShopify = await appExists("shopify");
  console.log({ hasNode, hasShopify });
}

main().catch(console.error);
```

Spawn a command with the workspace's cross-platform wrapper:

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

Load workspace package metadata:

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

Register process shutdown cleanup:

```ts
import { createProcessGracefulExit } from "@unimolecule/utils/node";

const gracefulExit = createProcessGracefulExit(console);
const cleanup = gracefulExit.createCleanup(server, async () => {
  await disposeProviders();
});

gracefulExit.register(cleanup);
```

Probe filesystem and path values:

```ts
import {
  checkProcessDiskAccess,
  formatPath,
  pathExists,
} from "@unimolecule/utils/node";

async function main() {
  await checkProcessDiskAccess(process.cwd());
  await pathExists("package.json");
  formatPath(String.raw`C:\Users\i7eo\app`);
}

main().catch(console.error);
```

Read local host addresses:

```ts
import { getLocalhostAddress } from "@unimolecule/utils/node";

const hosts = getLocalhostAddress();
console.log(hosts);
```

Build tsdown entries from a source directory:

```ts
import { outputEntryBuilder } from "@unimolecule/utils/node/output-entry-builder";

export default {
  entry: outputEntryBuilder("./src", {
    entries: "index",
  }),
};
```

## API

| Export                                         | Description                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `appExists(app, options?)`                     | Async PATH probe for an executable app.                                                   |
| `appExistsSync(app, options?)`                 | Sync PATH probe for an executable app.                                                    |
| `checkProcessDiskAccess(path?)`                | Verifies read/write access for a path, defaulting to `process.cwd()`.                     |
| `executeCommand(command, args?, options?)`     | Runs a command and resolves exit details when it succeeds.                                |
| `executeCommandSync(command, args?, options?)` | Sync command runner with the same success/error behavior.                                 |
| `formatPath(path)`                             | Converts backslash separators to `/` while leaving Unix paths unchanged.                  |
| `createProcessGracefulExit(logger?)`           | Creates isolated process signal registration and shutdown helpers.                        |
| `exitSignals`                                  | Supported graceful shutdown signals: `SIGINT`, `SIGQUIT`, `SIGTERM`.                      |
| `getLocalhostAddress()`                        | Returns non-internal IPv4 addresses plus `[::]`, with duplicates removed.                 |
| `getPackages(cwd?)`                            | Async export from `@manypkg/get-packages`.                                                |
| `getPackagesSync(cwd?)`                        | Sync export from `@manypkg/get-packages`.                                                 |
| `outputEntryBuilder(rootDir, options?)`        | Builds tsdown entry objects by scanning files; `entries: "index"` keeps only index files. |
| `pathExists(path)`                             | Async `fs.access` existence check.                                                        |
| `pathExistsSync(path)`                         | Sync `fs.accessSync` existence check.                                                     |
| `require`                                      | `createRequire(import.meta.url)` for ESM modules that need Node require.                  |
| `unifiedSpawn(command, args?, options?)`       | Cross-platform `spawn` wrapper.                                                           |
| `unifiedSpawnAsync(command, args?, options?)`  | Promise wrapper resolving the child close code.                                           |
| `unifiedSpawnSync(command, args?, options?)`   | Cross-platform `spawnSync` wrapper.                                                       |
| `userHome`                                     | Current `os.homedir()` value.                                                             |

## Runtime Notes

- This entry is for Node.js runtimes only.
- `appExists` and `unifiedSpawn` hide child windows on Windows and avoid stdio allocation unless callers request it.
- `createProcessGracefulExit` removes only listeners it registered, so multiple controllers or external signal listeners can coexist.
- `getLocalhostAddress()` is dynamic and reads network interfaces on every call.
