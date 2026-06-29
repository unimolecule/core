# @unimolecule/utils/web

<p><strong>English</strong> | <a href="./README.zh-CN.md">中文</a></p>

## Overview

`@unimolecule/utils/web` contains small browser runtime helpers used by this workspace's frontend and shared web-facing code. It focuses on cookie access and requestAnimationFrame-driven scheduling.

This entry is intentionally separate from the package root. Import it only from browser-like code because it may use platform capabilities such as `document.cookie`, `requestAnimationFrame`, `cancelAnimationFrame`, and `performance.now()`.

## Design

- Keep browser-only helpers out of the package root entry.
- Prefer `globalThis` feature checks so jsdom and browser runtimes can share the same code path.
- Keep cookie parsing and writing tolerant of missing `document.cookie`.
- Keep raf scheduling aligned with `performance.now()` and requestAnimationFrame when available.
- Reuse runtime-neutral helpers from the package root instead of duplicating shared logic.

## Usage

Read and write cookies:

```ts
import { Cookies } from "@unimolecule/utils/web";

Cookies.set("theme", "dark", {
  path: "/",
  sameSite: "lax",
});

const theme = Cookies.get("theme");
console.log(theme);
```

Create a scoped cookie API:

```ts
import { createCookies } from "@unimolecule/utils/web";

const AdminCookies = createCookies(undefined, {
  path: "/admin",
  sameSite: "strict",
});

AdminCookies.set("sidebar", "collapsed");
```

Store JSON-friendly values:

```ts
import { getCookieJSON, setCookieJSON } from "@unimolecule/utils/web";

setCookieJSON("settings", { density: "compact" });

const settings = getCookieJSON<{ density: string }>("settings");
console.log(settings);
```

Debounce or throttle browser-frame work:

```ts
import { rafDebounce, rafThrottle } from "@unimolecule/utils/web";

const onResize = rafDebounce(() => {
  console.log("resize settled");
}, 200);

const onScroll = rafThrottle(() => {
  console.log("scroll frame");
}, 100);

onResize.cancel();
onScroll.cancel();
```

Schedule one-off or repeated frame-aligned work:

```ts
import { rafSetInterval, rafSetTimeout } from "@unimolecule/utils/web";

const cancelTimeout = rafSetTimeout(() => {
  console.log("run once");
}, 300);

const cancelInterval = rafSetInterval(() => {
  console.log("run repeatedly");
}, 1000);

cancelTimeout();
cancelInterval();
```

## API

| Export                                    | Description                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| `Cookies`                                 | Default string-value cookie API with `get`, `set`, `remove`, and clone APIs. |
| `createCookies(converter?, attributes?)`  | Creates a cookie API with custom conversion and default attributes.          |
| `jsonConverter`                           | Cookie converter that serializes and deserializes JSON-friendly values.      |
| `hasCookie(name)`                         | Checks whether a cookie exists in the current browser-like document.         |
| `getCookieNames()`                        | Returns all readable cookie names.                                           |
| `clearAllCookies(attributes?)`            | Removes all readable cookies using the provided attributes.                  |
| `getCookieJSON(name)`                     | Reads one cookie and deserializes it with the package JSON helper.           |
| `setCookieJSON(name, value, attributes?)` | Serializes a value and writes it as a cookie.                                |
| `rafSetTimeout(callback, delay)`          | Runs a callback once with raf-compatible scheduling.                         |
| `rafSetInterval(callback, interval)`      | Runs a callback repeatedly with raf-compatible scheduling.                   |
| `rafDebounce(callback, delay)`            | Creates a cancelable debounced callback driven by requestAnimationFrame.     |
| `rafThrottle(callback, interval)`         | Creates a cancelable throttled callback driven by requestAnimationFrame.     |

## Runtime Notes

- This entry is for browser-like runtimes and tests under jsdom.
- Cookie helpers require `document.cookie`; without it they return empty values or no-op.
- `httpOnly` is included in cookie types for completeness, but client-side JavaScript cannot set it.
- raf helpers use `requestAnimationFrame` and `cancelAnimationFrame` when available, with a `setTimeout` fallback.
- raf timing uses `performance.now()` for elapsed-time calculations.
