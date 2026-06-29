# @unimolecule/utils

<p><strong>English</strong> | <a href="./README.zh-CN.md">中文</a></p>

## Table of Contents

- [Overview](#overview)
- [Design and Architecture](#design-and-architecture)
- [Inputs and Outputs](#inputs-and-outputs)
- [Usage](#usage)
- [Runtime Entries](#runtime-entries)
- [Runtime Notes](#runtime-notes)

## Overview

`@unimolecule/utils` is the shared utility package for the workspace. It provides
small and focused helpers for JSON serialization, dates, strings, runtime
checks, type guards, tree processing, random values, crypto hashes, sleep, and
common TypeScript utility types. Browser runtime helpers are available from
`@unimolecule/utils/web`, and Node.js runtime helpers are available from
`@unimolecule/utils/node`.

## Design and Architecture

`@unimolecule/utils` follows these design principles:

- Keep helpers small and independent, without binding them to a specific framework.
- Prefer pure functions whenever the behavior can be expressed as pure logic.
- Keep JSON serialization boundaries in `json.ts`; other packages should avoid direct `JSON.parse` / `JSON.stringify` calls.
- Avoid hard DOM type dependencies from the public entry, so Node, Workers, and browser builds can all type-check.
- Keep Node-only helpers out of the public root entry; import them from `@unimolecule/utils/node` or a `@unimolecule/utils/node/*` subpath.
- Keep browser-only helpers out of the public root entry; import them from `@unimolecule/utils/web` or a `@unimolecule/utils/web/*` subpath.
- Re-export selected external utilities such as `es-toolkit` from the package entry.
- Keep runtime-neutral crypto helpers on Web Crypto APIs so they work in Node
  and Workers.

Browser-related helpers such as `web/cookie.ts` and `web/raf.ts` use runtime checks based on `globalThis`. Import them from the explicit web entry so shared code does not accidentally depend on browser APIs.

## Inputs and Outputs

Inputs:

- Primitive values, objects, arrays, dates, JSON strings, tree nodes, callbacks, cookie names, and cookie values.
- Optional configuration objects, such as cookie attributes, tree field mappings, and random number options.

Outputs:

- JSON parse results or serialized strings.
- Formatted date strings.
- Type guard boolean results.
- Tree traversal results and transformed tree structures.
- Cookie strings or cookie values in browser runtimes.
- Cancel functions returned by raf scheduling helpers.
- TypeScript helper types for common type transformations.

## Usage

Use JSON helpers as the shared serialization boundary:

```ts
import { deserializeValue, serializeValue } from "@unimolecule/utils";

const raw = serializeValue({ id: "shop_1", enabled: true });
const parsed = deserializeValue<{ id: string; enabled: boolean }>(raw);
```

Use type guards to filter arrays:

```ts
import { notNullish } from "@unimolecule/utils";

const values = ["a", null, "b", undefined].filter(notNullish);
// string[]
```

Use date helpers:

```ts
import { diffDays, formatToDateTime, previousDay } from "@unimolecule/utils";

formatToDateTime(new Date());
diffDays("2026-06-07", "2026-06-01");
previousDay("2026-06-07");
```

Use cookie helpers in browser runtimes:

```ts
import { Cookies, getCookieJSON, setCookieJSON } from "@unimolecule/utils/web";

Cookies.set("locale", "en-US", { sameSite: "lax" });
const locale = Cookies.get("locale");

setCookieJSON("settings", { density: "compact" });
const settings = getCookieJSON<{ density: string }>("settings");
```

Use tree helpers:

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

Use timer scheduling helpers from the runtime-neutral entry:

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

Use raf scheduling helpers when work should align with browser frames:

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

Use Web Crypto helpers:

```ts
import { sha256Hex } from "@unimolecule/utils";

async function main() {
  const digest = await sha256Hex("secret-token");
  console.log(digest);
}

main().catch(console.error);
```

## Runtime Entries

Runtime-specific helpers are intentionally kept out of the package root entry.
Use the dedicated entry when code depends on browser or Node.js platform APIs.

| Entry                       | Scope                                                           | Reference                                  |
| --------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| `@unimolecule/utils/web`    | Browser helpers such as cookies and raf-driven scheduling.      | [src/web/README.md](./src/web/README.md)   |
| `@unimolecule/utils/node`   | Node.js helpers such as filesystem probes and process spawning. | [src/node/README.md](./src/node/README.md) |
| `@unimolecule/utils/web/*`  | Direct imports for individual browser helper modules.           | [src/web](./src/web)                       |
| `@unimolecule/utils/node/*` | Direct imports for individual Node.js helper modules.           | [src/node](./src/node)                     |

## Runtime Notes

`@unimolecule/utils` is designed for shared code, but some helpers still depend on specific runtime capabilities:

- Cookie helpers require browser-like `document.cookie`; in non-browser environments they return empty values or no-op.
- raf helpers prefer `requestAnimationFrame` and fall back to `setTimeout` when it is unavailable.
- `@unimolecule/utils/web` is the browser-focused entry and is tested with jsdom.
- `sha256Hex` uses `crypto.subtle.digest`, so the host runtime must provide Web
  Crypto.
- `@unimolecule/utils/node` is Node-only and depends on built-ins such as
  `child_process`, `fs`, `module`, `os`, `path`, and `process`.
- JSON helpers are runtime-neutral. Other workspace packages should prefer them over direct `JSON.parse` / `JSON.stringify` calls.
