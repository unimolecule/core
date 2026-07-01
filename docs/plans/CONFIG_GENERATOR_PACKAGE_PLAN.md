# App Config Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the root generated-config scripts into a reusable package that compiles one typed app env contract into first-version `wrangler`, `shopify`, and `dockerfile` targets.

**Architecture:** Keep `@shamt/app-env` as the semantic owner of env fields, defaults, constants, and runtime/provider contracts. Add `@shamt/app-config-generator` as a pure render package with explicit target adapters, then keep root `scripts/*` as thin CLI/file-system entrypoints that parse env and write project-owned files.

**Tech Stack:** TypeScript, pnpm workspace, tsdown, Vitest, Zod-derived `ConfigSchema`, Shopify TOML, Wrangler JSON, Dockerfile text rendering.

---

## Scope

Version 1 supports exactly these target adapters:

- `wrangler`: render `apps/server/wrangler.json` from `ConfigSchema`.
- `shopify`: render/update `shopify.app*.toml` and render `shopify.web.toml` files.
- `dockerfile`: render the Node process runtime `apps/server/Dockerfile`.

Version 1 does not support Vercel, Netlify, Kubernetes, Compose, Nginx, Cloudflare Pages, or generic template expansion.

## Package Boundary

`@shamt/app-env` owns:

- `configSchema`
- `ConfigSchema`
- runtime/provider constants
- Shopify app mode/frontend target constants
- field validation and defaults

`@shamt/app-config-generator` owns:

- target names and renderer registry
- target-specific output types
- pure render functions for `wrangler`, `shopify`, and `dockerfile`
- small serialization helpers that are not app-env concepts
- tests proving generated output is stable

Root `scripts/*` own:

- selecting `.env.development` or `.env.production` through existing package scripts
- reading existing Shopify TOML files before patching
- writing generated files to repo paths
- reporting CLI errors and process exit code

## File Structure

Create:

- `packages/app-config-generator/package.json` - package metadata, exports, scripts, and dependencies.
- `packages/app-config-generator/build.config.ts` - tsdown build entries.
- `packages/app-config-generator/tsconfig.json` - package TypeScript config.
- `packages/app-config-generator/tsconfig.node.json` - node build config matching existing package style.
- `packages/app-config-generator/README.md` - English package docs.
- `packages/app-config-generator/README.zh-CN.md` - Chinese package docs.
- `packages/app-config-generator/src/index.ts` - public exports.
- `packages/app-config-generator/src/types.ts` - shared target/output types.
- `packages/app-config-generator/src/utils.ts` - package-local serialization and error helpers.
- `packages/app-config-generator/src/targets/index.ts` - target adapter exports.
- `packages/app-config-generator/src/targets/wrangler.ts` - Wrangler JSON renderer.
- `packages/app-config-generator/src/targets/shopify.ts` - Shopify TOML/web-role renderer and patch helpers.
- `packages/app-config-generator/src/targets/dockerfile.ts` - Node Dockerfile renderer.
- `packages/app-config-generator/tests/wrangler.test.ts` - focused Wrangler renderer tests.
- `packages/app-config-generator/tests/shopify.test.ts` - focused Shopify renderer tests.
- `packages/app-config-generator/tests/dockerfile.test.ts` - focused Dockerfile renderer tests.

Modify:

- `scripts/write-wrangler-file/index.ts` - call `renderWranglerConfig` from the new package.
- `scripts/write-wrangler-file/wrangler.ts` - remove after call sites move, or leave temporarily only if migration is split.
- `scripts/write-shopify-file/index.ts` - call Shopify render/patch functions from the new package.
- `scripts/write-shopify-file/toml.ts` - remove after call sites move, or leave temporarily only if migration is split.
- `scripts/write-shopify-file/constants.ts` - keep repo path constants; move only reusable domain constants into the package.
- `package.json` - keep command names unchanged.
- `README.md` - keep root docs navigational and link to package docs.
- `packages/app-env/README.md` - mention that config file rendering moved to `@shamt/app-config-generator`.

Do not modify generated outputs by hand:

- `shopify.app.toml`
- `shopify.app.production.toml`
- `apps/server/shopify.web.toml`
- `apps/web/shopify.web.toml`
- `apps/server/wrangler.json`
- `apps/server/Dockerfile`

## Target Interfaces

Use explicit target functions rather than one auto-detecting function.

```ts
export type ConfigGeneratorTarget = "wrangler" | "shopify" | "dockerfile";

export interface GeneratedFile {
  path: string;
  contents: string;
}

export interface ShopifyAppTomlPatchInput {
  toml: string;
  config: ConfigSchema;
}

export interface ShopifyAppTomlPatchOutput {
  contents: string;
}
```

The package does not read env files and does not write files. It receives typed config and returns structured outputs.

## Implementation Tasks

### Task 1: Scaffold `@shamt/app-config-generator`

**Files:**

- Create: `packages/app-config-generator/package.json`
- Create: `packages/app-config-generator/build.config.ts`
- Create: `packages/app-config-generator/tsconfig.json`
- Create: `packages/app-config-generator/tsconfig.node.json`
- Create: `packages/app-config-generator/src/index.ts`
- Create: `packages/app-config-generator/src/types.ts`

- [ ] **Step 1: Create package metadata**

Use this package shape:

```json
{
  "name": "@shamt/app-config-generator",
  "type": "module",
  "version": "0.0.0",
  "private": true,
  "author": "i7eo",
  "license": "MIT",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts",
      "require": "./src/index.ts"
    },
    "./targets": {
      "types": "./src/targets/index.ts",
      "import": "./src/targets/index.ts",
      "require": "./src/targets/index.ts"
    },
    "./package.json": "./package.json"
  },
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "files": ["dist"],
  "publishConfig": {
    "main": "./dist/index.cjs",
    "module": "./dist/index.mjs",
    "types": "./dist/index.d.mts",
    "exports": {
      ".": {
        "types": "./dist/index.d.mts",
        "import": "./dist/index.mjs",
        "require": "./dist/index.cjs"
      },
      "./targets": {
        "types": "./dist/targets/index.d.mts",
        "import": "./dist/targets/index.mjs",
        "require": "./dist/targets/index.cjs"
      },
      "./package.json": "./package.json"
    }
  },
  "scripts": {
    "bundle": "tsdown --config ./build.config.ts",
    "dev": "node --env-file=../../.env.development --run bundle",
    "build": "node --env-file=../../.env.production --run bundle",
    "test": "vitest run",
    "format": "prettier \"./**/*.{js,ts,jsx,tsx,md,json,jsonc}\" --write",
    "lint": "TIMING=1 eslint \"./**/*.{js,jsx,ts,tsx,md,json,jsonc}\" --fix",
    "clean": "run-p \"clean:**\"",
    "clean:cache": "rimraf dist",
    "clean:deps": "rimraf node_modules"
  },
  "dependencies": {
    "@shamt/app-env": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "@unconfig/ts-config": "catalog:dx",
    "tsdown": "catalog:dx",
    "typescript": "catalog:",
    "vitest": "catalog:test"
  }
}
```

- [ ] **Step 2: Add build config**

Use the existing package build pattern:

```ts
import process from "node:process";
import { outputEntryBuilder } from "@unimolecule/utils/node";
import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    format: ["esm", "cjs"],
    platform: "node",
    dts: true,
    tsconfig: "./tsconfig.json",
    watch: process.env.APP_ENV === "development",
  },
  {
    entry: outputEntryBuilder("./src/targets"),
    format: ["esm", "cjs"],
    platform: "node",
    dts: true,
    tsconfig: "./tsconfig.node.json",
    outDir: "dist/targets",
    watch: process.env.APP_ENV === "development",
    clean: false,
  },
]);
```

- [ ] **Step 3: Add initial public types**

```ts
import type { ConfigSchema } from "@shamt/app-env";

export type AppConfigGeneratorTarget = "wrangler" | "shopify" | "dockerfile";

export interface GeneratedFile {
  path: string;
  contents: string;
}

export interface RendererContext {
  config: ConfigSchema;
}
```

- [ ] **Step 4: Run scaffold verification**

Run: `pnpm -F @shamt/app-config-generator build`

Expected: build succeeds and creates `packages/app-config-generator/dist`.

### Task 2: Move Wrangler Rendering Into The Package

**Files:**

- Create: `packages/app-config-generator/src/targets/wrangler.ts`
- Create: `packages/app-config-generator/tests/wrangler.test.ts`
- Modify: `packages/app-config-generator/src/targets/index.ts`
- Modify: `packages/app-config-generator/src/index.ts`
- Modify: `scripts/write-wrangler-file/index.ts`

- [ ] **Step 1: Write failing Wrangler tests**

Cover Cloudflare runtime binding generation and Node runtime rejection for unsupported providers:

```ts
import { describe, expect, it } from "vitest";
import { renderWranglerConfig } from "../src/targets/wrangler";

const baseConfig = {
  APP_ENV: "production",
  APP_RUNTIME: "cloudflare",
  APP_CLOUDFLARE_WORKER_NAME: "shopify-app",
  APP_BUCKET_PROVIDER: "r2",
  APP_BUCKET_R2_BINDING: "BUCKET",
  APP_BUCKET_R2_NAME: "shopify-files",
  APP_DATABASE_PROVIDER: "d1",
  APP_DATABASE_D1_BINDING: "DB",
  APP_DATABASE_D1_NAME: "shopify-db",
  APP_DATABASE_D1_ID: "d1-id",
  APP_QUEUE_PROVIDER: "queues",
  APP_QUEUE_NAME: "product-export",
  APP_QUEUE_BINDING: "PRODUCT_EXPORT_QUEUE",
  APP_QUEUE_CONSUMER_MAX_BATCH_SIZE: 10,
  APP_QUEUE_CONSUMER_MAX_RETRIES: 3,
  APP_SCHEDULER_PROVIDER: "cron-triggers",
  APP_SCHEDULER_CRON_VALUE: "*/5 * * * *",
} as const;

describe("renderWranglerConfig", () => {
  it("renders the active Cloudflare environment", () => {
    expect(renderWranglerConfig(baseConfig)).toEqual({
      main: "src/app/runtime/isolate/cloudflare/index.ts",
      compatibility_date: "2026-06-05",
      compatibility_flags: ["nodejs_compat"],
      observability: { enabled: true },
      env: {
        production: {
          name: "shopify-app",
          r2_buckets: [{ binding: "BUCKET", bucket_name: "shopify-files" }],
          d1_databases: [
            {
              binding: "DB",
              database_name: "shopify-db",
              database_id: "d1-id",
              migrations_dir: "drizzle.d1",
            },
          ],
          queues: {
            producers: [
              { binding: "PRODUCT_EXPORT_QUEUE", queue: "product-export" },
            ],
            consumers: [
              {
                dead_letter_queue: "product-export-dlq",
                max_batch_size: 10,
                max_retries: 3,
                queue: "product-export",
              },
            ],
          },
          triggers: { crons: ["*/5 * * * *"] },
        },
      },
    });
  });
});
```

- [ ] **Step 2: Move implementation**

Move the current pure logic from `scripts/write-wrangler-file/wrangler.ts` into `packages/app-config-generator/src/targets/wrangler.ts`. Keep `writeFile`, repo path resolution, and `process.env` parsing out of the package.

- [ ] **Step 3: Export the target**

```ts
export * from "./wrangler";
```

Root export:

```ts
export * from "./types";
export * from "./targets";
```

- [ ] **Step 4: Thin the root script**

Change `scripts/write-wrangler-file/index.ts` to:

```ts
import { writeFile } from "node:fs/promises";
import { configSchema } from "@shamt/app-env";
import { renderWranglerConfig } from "@shamt/app-config-generator/targets";
import { wranglerPath } from "./constants";

async function main() {
  const config = configSchema.parse(process.env);
  const wrangler = renderWranglerConfig(config);

  await writeFile(wranglerPath, `${JSON.stringify(wrangler, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 5: Verify Wrangler target**

Run: `pnpm -F @shamt/app-config-generator test -- wrangler`

Expected: Wrangler tests pass.

Run: `pnpm dev:prepare:wrangler`

Expected: `apps/server/wrangler.json` is regenerated with the same shape as before.

### Task 3: Move Shopify Rendering Into The Package

**Files:**

- Create: `packages/app-config-generator/src/targets/shopify.ts`
- Create: `packages/app-config-generator/tests/shopify.test.ts`
- Modify: `packages/app-config-generator/src/targets/index.ts`
- Modify: `scripts/write-shopify-file/index.ts`

- [ ] **Step 1: Write failing Shopify tests**

Cover app TOML patching and web role rendering:

```ts
import { describe, expect, it } from "vitest";
import {
  patchShopifyAppToml,
  renderShopifyWebToml,
} from "../src/targets/shopify";

describe("patchShopifyAppToml", () => {
  it("updates owned Shopify fields and preserves unrelated sections", () => {
    const input = [
      'name = "Existing"',
      'client_id = "old"',
      'application_url = "https://old.example.com"',
      "embedded = false",
      "",
      "[webhooks]",
      'api_version = "2025-01"',
      "",
      "[custom]",
      'value = "keep"',
      "",
    ].join("\n");

    const output = patchShopifyAppToml(input, {
      SHOPIFY_APP_KEY: "new-key",
      SHOPIFY_APP_URL: "https://app.example.com",
      SHOPIFY_APP_MODE: "embedded",
      SHOPIFY_API_VERSION: "2026-01",
      SCOPES: "read_products,write_products",
    });

    expect(output).toContain('client_id = "new-key"');
    expect(output).toContain('application_url = "https://app.example.com"');
    expect(output).toContain("embedded = true");
    expect(output).toContain('[custom]\nvalue = "keep"');
  });
});

describe("renderShopifyWebToml", () => {
  it("renders role commands", () => {
    expect(
      renderShopifyWebToml({
        roles: ["backend"],
        port: 3000,
        command: {
          dev: "pnpm node:dev",
          build: "pnpm node:deploy",
        },
      }),
    ).toBe(
      [
        'roles = ["backend"]',
        "port = 3000",
        "",
        "[commands]",
        'dev = "pnpm node:dev"',
        'build = "pnpm node:deploy"',
        "",
      ].join("\n"),
    );
  });
});
```

- [ ] **Step 2: Move TOML helpers**

Move `formatTomlString`, `replaceOrInsertTopLevelValue`, `replaceOrInsertSectionValue`, and `replaceSectionArray` into `packages/app-config-generator/src/targets/shopify.ts` or a package-local helper used only by this target.

- [ ] **Step 3: Keep repo-specific Shopify paths outside the package**

Keep these in `scripts/write-shopify-file/constants.ts`:

```ts
export const serverShopifyWebPath = path.resolve(
  root,
  "apps/server/shopify.web.toml",
);

export const webShopifyWebPath = path.resolve(
  root,
  "apps/web/shopify.web.toml",
);
```

Move only reusable Shopify generation rules into the package:

```ts
export const shopifyRedirectPaths = [
  "/auth/shopify/callback",
  "/auth/shopify/token-exchange",
] as const;
```

- [ ] **Step 4: Thin the root Shopify script**

Keep file reads/writes in `scripts/write-shopify-file/index.ts`, but call package functions for render/patch logic:

```ts
import {
  getServerShopifyWebToml,
  getWebShopifyWebToml,
  patchShopifyAppToml,
} from "@shamt/app-config-generator/targets";
```

- [ ] **Step 5: Verify Shopify target**

Run: `pnpm -F @shamt/app-config-generator test -- shopify`

Expected: Shopify tests pass.

Run: `pnpm dev:prepare:shopify`

Expected: Shopify TOML and web role files are regenerated with the same intended values and preserved unrelated TOML sections.

### Task 4: Add Dockerfile Rendering

**Files:**

- Create: `packages/app-config-generator/src/targets/dockerfile.ts`
- Create: `packages/app-config-generator/tests/dockerfile.test.ts`
- Modify: `packages/app-config-generator/src/targets/index.ts`
- Create: `scripts/write-dockerfile/index.ts`
- Create: `scripts/write-dockerfile/constants.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing Dockerfile tests**

Use the current `apps/server/Dockerfile` as the v1 contract:

```ts
import { describe, expect, it } from "vitest";
import { renderDockerfile } from "../src/targets/dockerfile";

describe("renderDockerfile", () => {
  it("renders the Node process runtime Dockerfile", () => {
    expect(
      renderDockerfile({
        nodeImage: "node:26.2.0-slim",
        appWorkspace: "apps/server",
        processEntry: "./dist/process/index.mjs",
        processName: "server",
      }),
    ).toBe(
      [
        "FROM node:26.2.0-slim",
        "",
        "WORKDIR /app",
        "",
        "ENV NODE_ENV=production",
        "",
        "RUN corepack enable && npm install --global pm2 tsx",
        "",
        "COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./",
        "COPY packages ./packages",
        "COPY apps/server/package.json ./apps/server/package.json",
        "",
        "RUN pnpm install --frozen-lockfile --prod",
        "",
        "COPY apps/server/dist/process ./apps/server/dist/process",
        "",
        "WORKDIR /app/apps/server",
        "",
        'CMD ["pm2-runtime", "start", "./dist/process/index.mjs", "--interpreter", "node", "--name", "server"]',
        "",
      ].join("\n"),
    );
  });
});
```

- [ ] **Step 2: Implement the Dockerfile renderer**

```ts
export interface DockerfileRenderInput {
  nodeImage: string;
  appWorkspace: "apps/server";
  processEntry: string;
  processName: string;
}

export function renderDockerfile(input: DockerfileRenderInput) {
  return [
    `FROM ${input.nodeImage}`,
    "",
    "WORKDIR /app",
    "",
    "ENV NODE_ENV=production",
    "",
    "RUN corepack enable && npm install --global pm2 tsx",
    "",
    "COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./",
    "COPY packages ./packages",
    `COPY ${input.appWorkspace}/package.json ./${input.appWorkspace}/package.json`,
    "",
    "RUN pnpm install --frozen-lockfile --prod",
    "",
    `COPY ${input.appWorkspace}/dist/process ./${input.appWorkspace}/dist/process`,
    "",
    `WORKDIR /app/${input.appWorkspace}`,
    "",
    `CMD ["pm2-runtime", "start", "${input.processEntry}", "--interpreter", "node", "--name", "${input.processName}"]`,
    "",
  ].join("\n");
}
```

- [ ] **Step 3: Add root Dockerfile writer**

Create `scripts/write-dockerfile/constants.ts`:

```ts
import path from "node:path";
import { throwRepositoryError as throwError } from "../utils";

export const root = process.env.INIT_CWD;

if (!root) {
  throwError("write-dockerfile", "Cannot find monorepo root");
}

export const dockerfilePath = path.resolve(root, "apps/server/Dockerfile");
```

Create `scripts/write-dockerfile/index.ts`:

```ts
import { writeFile } from "node:fs/promises";
import { renderDockerfile } from "@shamt/app-config-generator/targets";
import { dockerfilePath } from "./constants";

async function main() {
  const dockerfile = renderDockerfile({
    nodeImage: "node:26.2.0-slim",
    appWorkspace: "apps/server",
    processEntry: "./dist/process/index.mjs",
    processName: "server",
  });

  await writeFile(dockerfilePath, dockerfile);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 4: Add root commands**

Add:

```json
{
  "dev:prepare:dockerfile": "node --env-file=./.env.development --import tsx ./scripts/write-dockerfile/index.ts",
  "deploy:prepare:dockerfile": "node --env-file=./.env.production --import tsx ./scripts/write-dockerfile/index.ts"
}
```

The existing `dev:prepare` and `deploy:prepare` commands already run `run-s "dev:prepare:**"` and `run-s "deploy:prepare:**"`, so the new scripts join the prepare lifecycle without changing the parent command names.

- [ ] **Step 5: Verify Dockerfile target**

Run: `pnpm -F @shamt/app-config-generator test -- dockerfile`

Expected: Dockerfile tests pass.

Run: `pnpm dev:prepare:dockerfile`

Expected: `apps/server/Dockerfile` is regenerated and still starts `dist/process/index.mjs` with `pm2-runtime`.

### Task 5: Add Target Registry Without Hiding Target Choice

**Files:**

- Modify: `packages/app-config-generator/src/types.ts`
- Create: `packages/app-config-generator/src/targets/registry.ts`
- Modify: `packages/app-config-generator/src/targets/index.ts`
- Create: `packages/app-config-generator/tests/registry.test.ts`

- [ ] **Step 1: Add registry types**

```ts
export interface TargetDescriptor {
  target: AppConfigGeneratorTarget;
  description: string;
}
```

- [ ] **Step 2: Add explicit target descriptors**

```ts
import type { TargetDescriptor } from "../types";

export const appConfigGeneratorTargets = [
  {
    target: "wrangler",
    description: "Render Cloudflare Workers wrangler.json from typed app env.",
  },
  {
    target: "shopify",
    description: "Render Shopify CLI TOML config from typed app env.",
  },
  {
    target: "dockerfile",
    description: "Render the Node process runtime Dockerfile.",
  },
] as const satisfies readonly TargetDescriptor[];
```

- [ ] **Step 3: Test registry stability**

```ts
import { describe, expect, it } from "vitest";
import { appConfigGeneratorTargets } from "../src/targets/registry";

describe("appConfigGeneratorTargets", () => {
  it("lists the first-version targets explicitly", () => {
    expect(appConfigGeneratorTargets.map((target) => target.target)).toEqual([
      "wrangler",
      "shopify",
      "dockerfile",
    ]);
  });
});
```

- [ ] **Step 4: Verify registry**

Run: `pnpm -F @shamt/app-config-generator test -- registry`

Expected: registry tests pass.

### Task 6: Documentation Updates

**Files:**

- Create: `packages/app-config-generator/README.md`
- Create: `packages/app-config-generator/README.zh-CN.md`
- Modify: `packages/app-env/README.md`
- Modify: `README.md`

- [ ] **Step 1: Write package README**

The English README must include:

- purpose
- package boundary
- supported targets
- import examples
- runtime notes
- gotchas around generated files and secrets

Example import:

```ts
import { renderWranglerConfig } from "@shamt/app-config-generator/targets";
import { configSchema } from "@shamt/app-env";

const config = configSchema.parse(process.env);
const wrangler = renderWranglerConfig(config);
```

- [ ] **Step 2: Write Chinese README**

The Chinese README must mirror the English structure and explain:

- `@shamt/app-env` 负责 env 语义
- `@shamt/app-config-generator` 负责配置文件渲染
- v1 只支持 `wrangler`、`shopify`、`dockerfile`
- 包本身不读取 `.env.*`，也不写文件

- [ ] **Step 3: Update app-env README**

Add one sentence to the boundaries section:

```md
- Config file rendering for Wrangler, Shopify, and Dockerfile targets lives in
  `@shamt/app-config-generator`; this package only owns env schema and constants.
```

- [ ] **Step 4: Update root README**

Keep the root README navigational. Add a short package row or paragraph that links to `packages/app-config-generator/README.md`.

- [ ] **Step 5: Inspect docs**

Run: `pnpm -F @shamt/app-config-generator lint`

Expected: package Markdown and TypeScript lint fixes complete without unrelated changes.

### Task 7: Final Verification

**Files:**

- Package files created above.
- Root scripts touched above.
- Generated outputs may be rewritten by prepare commands.

- [ ] **Step 1: Run package tests**

Run: `pnpm -F @shamt/app-config-generator test`

Expected: all package tests pass.

- [ ] **Step 2: Run package build**

Run: `pnpm -F @shamt/app-config-generator build`

Expected: package build passes and emits `dist`.

- [ ] **Step 3: Run prepare commands**

Run: `pnpm dev:prepare`

Expected: `shopify`, `wrangler`, and `dockerfile` generation all complete.

- [ ] **Step 4: Inspect generated diff**

Run: `git diff -- apps/server/wrangler.json apps/server/Dockerfile apps/server/shopify.web.toml apps/web/shopify.web.toml shopify.app.toml shopify.app.production.toml`

Expected: generated outputs either match the existing committed shape or show only intentional formatting/output changes from the new renderers.

- [ ] **Step 5: Run focused package lint**

Run: `pnpm -F @shamt/app-config-generator lint`

Expected: lint passes or fixes only package-owned files.

- [ ] **Step 6: Commit implementation**

Use a scoped commit after review:

```bash
git add packages/app-config-generator scripts/write-wrangler-file scripts/write-shopify-file scripts/write-dockerfile package.json README.md packages/app-env/README.md
git commit -m "feat: extract app config generator package"
```

## Risks And Decisions

- The package must not parse raw env files; doing so would duplicate `@shamt/app-env` and make provider validation drift.
- The package must not own repo paths; root scripts own path decisions.
- The Dockerfile target is Node process runtime only in v1. Cloudflare runtime deployment remains Wrangler-owned.
- Shopify TOML patching must preserve unrelated sections because Shopify CLI may add app-owned fields over time.
- Wrangler validation should stay aligned with runtime/provider boundaries already documented for database, bucket, queue, and scheduler.

## Self-Review

- Spec coverage: first-version support is limited to `wrangler`, `shopify`, and `dockerfile`.
- Boundary coverage: env semantics stay in `@shamt/app-env`; rendering moves to `@shamt/app-config-generator`; file writes stay in root scripts.
- Test coverage: each target has focused snapshot-style exact output tests plus prepare-command verification.
- Documentation coverage: package docs are paired English/Chinese, root README remains navigational, and app-env docs keep ownership clear.
