import { writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  clearResolverCache,
  getResolverCacheStats,
  RESOLVER_CACHE_LIMITS,
  RESOLVER_CACHE_TTLS,
  resolveTsconfigPath,
} from "../src/index";
import { createFixture } from "./helpers/fixture";

describe("resolveTsconfigPath", () => {
  it("resolves repeated aliases from the importer package tsconfig", async () => {
    const fixture = await createFixture({
      "apps/server/package.json": JSON.stringify({ name: "@fixture/server" }),
      "apps/server/tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["src/*"],
          },
        },
      }),
      "apps/server/src/constants.ts": "export const value = 'server';",
      "packages/envs/package.json": JSON.stringify({ name: "@fixture/envs" }),
      "packages/envs/tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["src/*"],
          },
        },
      }),
      "packages/envs/src/constants/index.ts": "export const value = 'envs';",
      "packages/envs/src/configs/redis.ts": "import '@/constants';",
    });

    const result = await resolveTsconfigPath("@/constants", {
      parentURL: pathToFileURL(
        fixture.path("packages/envs/src/configs/redis.ts"),
      ).href,
    });

    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") {
      throw new Error(result.reason);
    }
    expect(result.resolvedPath).toBe(
      fixture.path("packages/envs/src/constants/index.ts"),
    );
    expect(result.packageRoot).toBe(fixture.path("packages/envs"));
    expect(result.tsconfigPath).toBe(
      fixture.path("packages/envs/tsconfig.json"),
    );
  });

  it("returns not handled for package imports and relative imports", async () => {
    const fixture = await createFixture({
      "packages/envs/package.json": JSON.stringify({ name: "@fixture/envs" }),
      "packages/envs/tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["src/*"],
          },
        },
      }),
      "packages/envs/src/index.ts": "",
    });

    const parentURL = pathToFileURL(
      fixture.path("packages/envs/src/index.ts"),
    ).href;

    await expect(
      resolveTsconfigPath("@fixture/other", { parentURL }),
    ).resolves.toMatchObject({ status: "not-handled" });
    await expect(
      resolveTsconfigPath("./constants", { parentURL }),
    ).resolves.toMatchObject({ status: "not-handled" });
  });

  it("honors package-level opt out", async () => {
    const fixture = await createFixture({
      "packages/envs/package.json": JSON.stringify({
        name: "@fixture/envs",
        monorepoTsconfigPaths: false,
      }),
      "packages/envs/tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["src/*"],
          },
        },
      }),
      "packages/envs/src/constants.ts": "export const value = 'envs';",
      "packages/envs/src/index.ts": "import '@/constants';",
    });

    await expect(
      resolveTsconfigPath("@/constants", {
        parentURL: pathToFileURL(fixture.path("packages/envs/src/index.ts"))
          .href,
      }),
    ).resolves.toMatchObject({ status: "not-handled" });
  });

  it("resolves paths from extended JSONC tsconfig files", async () => {
    const fixture = await createFixture({
      "packages/envs/package.json": JSON.stringify({
        name: "@fixture/envs",
        monorepoTsconfigPaths: {
          tsconfig: "tsconfig.node.json",
        },
      }),
      "packages/envs/tsconfig.paths.json": `{
        // JSONC comments are accepted in tsconfig files.
        "compilerOptions": {
          "baseUrl": ".",
          "paths": {
            "@/*": ["src/*"]
          }
        }
      }`,
      "packages/envs/tsconfig.node.json": JSON.stringify({
        extends: "./tsconfig.paths.json",
        compilerOptions: {
          module: "NodeNext",
        },
      }),
      "packages/envs/src/constants.ts": "export const value = 'envs';",
      "packages/envs/src/index.ts": "import '@/constants';",
    });

    const result = await resolveTsconfigPath("@/constants", {
      parentURL: pathToFileURL(fixture.path("packages/envs/src/index.ts")).href,
    });

    expect(result).toMatchObject({
      status: "resolved",
      resolvedPath: fixture.path("packages/envs/src/constants.ts"),
      tsconfigPath: fixture.path("packages/envs/tsconfig.node.json"),
    });
  });

  it("keeps tsconfig lookups cached until resolver caches are cleared", async () => {
    const fixture = await createFixture({
      "packages/envs/package.json": JSON.stringify({ name: "@fixture/envs" }),
      "packages/envs/tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["src/one/*"],
          },
        },
      }),
      "packages/envs/src/index.ts": "import '@/constants';",
      "packages/envs/src/one/constants.ts": "export const value = 'one';",
      "packages/envs/src/two/constants.ts": "export const value = 'two';",
    });
    const parentURL = pathToFileURL(
      fixture.path("packages/envs/src/index.ts"),
    ).href;

    const first = await resolveTsconfigPath("@/constants", { parentURL });
    expect(first).toMatchObject({
      status: "resolved",
      resolvedPath: fixture.path("packages/envs/src/one/constants.ts"),
    });

    await writeFile(
      fixture.path("packages/envs/tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["src/two/*"],
          },
        },
      }),
    );

    const cached = await resolveTsconfigPath("@/constants", { parentURL });
    expect(cached).toMatchObject({
      status: "resolved",
      resolvedPath: fixture.path("packages/envs/src/one/constants.ts"),
    });

    clearResolverCache();

    const refreshed = await resolveTsconfigPath("@/constants", { parentURL });
    expect(refreshed).toMatchObject({
      status: "resolved",
      resolvedPath: fixture.path("packages/envs/src/two/constants.ts"),
    });
  });

  it("keeps resolver caches bounded under many unique importers", async () => {
    clearResolverCache();

    const packageCount = RESOLVER_CACHE_LIMITS.packageConfig + 20;
    const files: Record<string, string> = {};

    for (let index = 0; index < packageCount; index += 1) {
      files[`packages/pkg-${index}/package.json`] = JSON.stringify({
        name: `@fixture/pkg-${index}`,
      });
      files[`packages/pkg-${index}/tsconfig.json`] = JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["src/*"],
          },
        },
      });
      files[`packages/pkg-${index}/src/index.ts`] = "import '@/constants';";
      files[`packages/pkg-${index}/src/constants.ts`] =
        `export const value = ${index};`;
    }

    const fixture = await createFixture(files);

    for (let index = 0; index < packageCount; index += 1) {
      const result = await resolveTsconfigPath("@/constants", {
        parentURL: pathToFileURL(
          fixture.path(`packages/pkg-${index}/src/index.ts`),
        ).href,
      });
      expect(result.status).toBe("resolved");
    }

    const stats = getResolverCacheStats();
    expect(stats.packageConfig.size).toBeLessThanOrEqual(
      RESOLVER_CACHE_LIMITS.packageConfig,
    );
    expect(stats.tsconfigPath.size).toBeLessThanOrEqual(
      RESOLVER_CACHE_LIMITS.tsconfigPath,
    );
    expect(stats.tsconfig.size).toBeLessThanOrEqual(
      RESOLVER_CACHE_LIMITS.tsconfig,
    );
    expect(stats.matcher.size).toBeLessThanOrEqual(
      RESOLVER_CACHE_LIMITS.matcher,
    );
    expect(stats.fileProbe.size).toBeLessThanOrEqual(
      RESOLVER_CACHE_LIMITS.fileProbe,
    );
  });

  it("expires negative file probes so generated files can appear in dev servers", async () => {
    clearResolverCache();

    const fixture = await createFixture({
      "packages/envs/package.json": JSON.stringify({ name: "@fixture/envs" }),
      "packages/envs/tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["src/*"],
          },
        },
      }),
      "packages/envs/src/index.ts": "import '@/generated';",
    });
    const parentURL = pathToFileURL(
      fixture.path("packages/envs/src/index.ts"),
    ).href;

    const missing = await resolveTsconfigPath("@/generated", { parentURL });
    expect(missing).toMatchObject({
      status: "not-handled",
      reason: "no candidate file exists",
    });

    await writeFile(
      fixture.path("packages/envs/src/generated.ts"),
      "export const value = 'generated';",
    );

    await setTimeout(RESOLVER_CACHE_TTLS.fileProbe + 20);

    const generated = await resolveTsconfigPath("@/generated", { parentURL });
    expect(generated).toMatchObject({
      status: "resolved",
      resolvedPath: fixture.path("packages/envs/src/generated.ts"),
    });
  });
});
