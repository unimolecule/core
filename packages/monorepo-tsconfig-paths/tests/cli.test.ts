import { writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createFixture } from "./helpers/fixture";
import { runNode } from "./helpers/run";

describe("CLI", () => {
  it("prints debug resolution details", async () => {
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
      "packages/envs/src/constants.ts": "export const value = 'envs';",
      "packages/envs/src/configs/redis.ts": "import '@/constants';",
    });

    const result = await runNode(
      [
        "--import",
        "tsx",
        cliPath,
        "debug",
        "resolve",
        "@/constants",
        "--from",
        fixture.path("packages/envs/src/configs/redis.ts"),
      ],
      packageRoot,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("specifier: @/constants");
    expect(result.stdout).toContain("result: resolved");
  });

  it("preserves child exit code for node wrapper", async () => {
    const fixture = await createFixture({});
    const scriptPath = fixture.path("exit-code.mjs");
    await writeFile(scriptPath, "process.exit(7);");

    const result = await runNode(
      ["--import", "tsx", cliPath, "node", scriptPath],
      packageRoot,
    );

    expect(result.exitCode).toBe(7);
  });
});

const cliPath = new URL("../src/cli/index.ts", import.meta.url).pathname;
const packageRoot = new URL("..", import.meta.url).pathname;
