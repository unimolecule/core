import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { describeResolution } from "../src/index";
import { createFixture } from "./helpers/fixture";

describe("describeResolution", () => {
  it("explains which package tsconfig handled a specifier", async () => {
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
      "packages/envs/src/constants/index.ts": "export const value = 'envs';",
      "packages/envs/src/configs/redis.ts": "import '@/constants';",
    });

    const output = await describeResolution("@/constants", {
      parentURL: pathToFileURL(
        fixture.path("packages/envs/src/configs/redis.ts"),
      ).href,
    });

    expect(output).toContain("specifier: @/constants");
    expect(output).toContain("package root: packages/envs");
    expect(output).toContain("tsconfig: packages/envs/tsconfig.json");
    expect(output).toContain("matched path: @/*");
    expect(output).toContain("candidate: packages/envs/src/constants/index.ts");
    expect(output).toContain("result: resolved");
  });
});
