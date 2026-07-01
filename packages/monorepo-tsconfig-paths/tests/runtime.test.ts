import { describe, expect, it } from "vitest";
import { createFixture } from "./helpers/fixture";
import { runNode } from "./helpers/run";

describe("runtime wrapper", () => {
  it("loads aliases by importer package through the node wrapper", async () => {
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
      "apps/server/src/constants.ts":
        "export const value = 'wrong server value';",
      "apps/server/scripts/check.ts":
        "import { value } from '../../../packages/envs/src/configs/redis'; console.log(value);",
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
      "packages/envs/src/configs/redis.ts":
        "import { value } from '@/constants'; export { value };",
    });

    const result = await runNode(
      [
        "--import",
        "tsx",
        cliPath,
        "node",
        "--import",
        "tsx",
        fixture.path("apps/server/scripts/check.ts"),
      ],
      packageRoot,
    );

    if (result.exitCode !== 0) {
      throw new Error(JSON.stringify(result.stderr));
    }

    expect(result).toMatchObject({
      exitCode: 0,
      stdout: "envs\n",
    });
  });

  it("loads aliases through the tsx wrapper", async () => {
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
      "packages/envs/src/constants.ts": "export const value = 'tsx';",
      "packages/envs/scripts/check.ts":
        "import { value } from '@/constants'; console.log(value);",
    });

    const result = await runNode(
      [
        "--import",
        "tsx",
        cliPath,
        "tsx",
        fixture.path("packages/envs/scripts/check.ts"),
      ],
      packageRoot,
    );

    if (result.exitCode !== 0) {
      throw new Error(JSON.stringify(result.stderr));
    }

    expect(result).toMatchObject({
      exitCode: 0,
      stdout: "tsx\n",
    });
  });

  it("loads aliases while Vite evaluates config files", async () => {
    const fixture = await createFixture({
      "package.json": JSON.stringify({ name: "@fixture/app", type: "module" }),
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["src/*"],
          },
        },
      }),
      "index.html": '<script type="module" src="/src/main.ts"></script>',
      "src/constants.ts": "export const value = 'vite';",
      "src/main.ts": "console.log(__MTP_VALUE__);",
      "vite.config.ts": `
        import { fileURLToPath } from 'node:url';
        import { value } from '@/constants';

        export default {
          root: fileURLToPath(new URL('.', import.meta.url)),
          logLevel: 'silent',
          define: {
            __MTP_VALUE__: JSON.stringify(value),
          },
          build: {
            emptyOutDir: true,
            outDir: 'dist',
          },
        };
      `,
    });

    const result = await runNode(
      [
        "--import",
        "tsx",
        cliPath,
        "vite",
        "build",
        "--config",
        fixture.path("vite.config.ts"),
      ],
      packageRoot,
    );

    if (result.exitCode !== 0) {
      throw new Error(JSON.stringify(result.stderr));
    }

    expect(result.exitCode).toBe(0);
  });

  it("can deregister runtime hooks without leaving process-level resolvers behind", async () => {
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
      "packages/envs/src/after.ts": "export const value = 'after';",
      "packages/envs/scripts/check.ts": `
        import { registerMonorepoTsconfigPaths } from ${JSON.stringify(registerPath)};

        async function main() {
          registerMonorepoTsconfigPaths();
          const first = await import('@/constants');
          console.log(first.value);

          registerMonorepoTsconfigPaths().deregister();
          await import('@/after').then(
            () => console.log('unexpected'),
            () => console.log('deregistered'),
          );
        }

        main();
      `,
    });

    const result = await runNode(
      ["--import", "tsx", fixture.path("packages/envs/scripts/check.ts")],
      packageRoot,
    );

    if (result.exitCode !== 0) {
      throw new Error(JSON.stringify(result.stderr));
    }

    expect(result).toMatchObject({
      exitCode: 0,
      stdout: "envs\nderegistered\n",
    });
  });
});

const cliPath = new URL("../src/cli/index.ts", import.meta.url).pathname;
const packageRoot = new URL("..", import.meta.url).pathname;
const registerPath = new URL("../src/node/register.ts", import.meta.url).href;
