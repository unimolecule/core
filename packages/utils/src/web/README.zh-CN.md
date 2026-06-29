# @unimolecule/utils/web

<p><a href="./README.md">English</a> | <strong>中文</strong></p>

## 介绍

`@unimolecule/utils/web` 提供一组面向浏览器运行时的小工具，主要服务于本 workspace 的前端和 shared web-facing code。它覆盖 cookie 访问和 requestAnimationFrame 驱动的调度能力。

这个入口与包根入口保持分离。请只在浏览器式代码中导入它，因为它可能使用 `document.cookie`、`requestAnimationFrame`、`cancelAnimationFrame`、`performance.now()` 等平台能力。

## 设计

- browser-only helper 不进入包根入口。
- 优先使用 `globalThis` feature check，让 jsdom 和浏览器 runtime 共用同一条代码路径。
- cookie 读写在缺少 `document.cookie` 时保持容错。
- raf 调度基于 `performance.now()`，并优先与 requestAnimationFrame 对齐。
- 复用包根入口中的 runtime-neutral helper，避免复制共享逻辑。

## 使用方式

读取和写入 cookie：

```ts
import { Cookies } from "@unimolecule/utils/web";

Cookies.set("theme", "dark", {
  path: "/",
  sameSite: "lax",
});

const theme = Cookies.get("theme");
console.log(theme);
```

创建带默认属性的 cookie API：

```ts
import { createCookies } from "@unimolecule/utils/web";

const AdminCookies = createCookies(undefined, {
  path: "/admin",
  sameSite: "strict",
});

AdminCookies.set("sidebar", "collapsed");
```

存储 JSON-friendly 值：

```ts
import { getCookieJSON, setCookieJSON } from "@unimolecule/utils/web";

setCookieJSON("settings", { density: "compact" });

const settings = getCookieJSON<{ density: string }>("settings");
console.log(settings);
```

对浏览器帧相关工作做 debounce 或 throttle：

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

调度一次性或重复的帧对齐任务：

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

| Export                                    | 说明                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `Cookies`                                 | 默认的 string-value cookie API，包含 `get`、`set`、`remove` 和 clone API。 |
| `createCookies(converter?, attributes?)`  | 使用自定义转换器和默认属性创建 cookie API。                                |
| `jsonConverter`                           | 用于序列化和反序列化 JSON-friendly 值的 cookie converter。                 |
| `hasCookie(name)`                         | 判断当前浏览器式 document 中是否存在指定 cookie。                          |
| `getCookieNames()`                        | 返回所有可读取的 cookie 名称。                                             |
| `clearAllCookies(attributes?)`            | 使用给定属性移除所有可读取 cookie。                                        |
| `getCookieJSON(name)`                     | 读取一个 cookie，并使用包内 JSON helper 反序列化。                         |
| `setCookieJSON(name, value, attributes?)` | 序列化值并写入 cookie。                                                    |
| `rafSetTimeout(callback, delay)`          | 使用 raf-compatible 调度执行一次 callback。                                |
| `rafSetInterval(callback, interval)`      | 使用 raf-compatible 调度重复执行 callback。                                |
| `rafDebounce(callback, delay)`            | 创建由 requestAnimationFrame 驱动的 cancelable debounced callback。        |
| `rafThrottle(callback, interval)`         | 创建由 requestAnimationFrame 驱动的 cancelable throttled callback。        |

## 运行时说明

- 这个入口适用于 browser-like runtime，并在 jsdom 下测试。
- Cookie helper 需要 `document.cookie`；不存在时会返回空值或 no-op。
- `httpOnly` 出现在 cookie 类型中是为了类型完整性，但 client-side JavaScript 不能设置它。
- raf helper 优先使用 `requestAnimationFrame` 和 `cancelAnimationFrame`，不可用时退化为 `setTimeout`。
- raf elapsed-time 计算使用 `performance.now()`。
