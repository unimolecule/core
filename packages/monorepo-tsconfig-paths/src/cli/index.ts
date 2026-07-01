#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { exitSignals } from "@unimolecule/utils/node";
import { pathExistsSync } from "@unimolecule/utils/node/path-exists";
import { unifiedSpawn } from "@unimolecule/utils/node/unified-spawn";
import { describeResolution } from "../diagnostics/debug.ts";

async function main(argv: string[]) {
  const [command, ...args] = argv;

  if (command === "debug") {
    await runDebug(args);
    return;
  }

  if (command === "node") {
    await runNode(args);
    return;
  }

  if (command === "tsx") {
    await runTsx(args);
    return;
  }

  if (command === "vite") {
    await runBinary(command, args);
    return;
  }

  printUsage();
  process.exitCode = 1;
}

async function runDebug(args: string[]) {
  const [subcommand, specifier, ...rest] = args;
  const fromIndex = rest.indexOf("--from");
  const from = fromIndex === -1 ? undefined : rest[fromIndex + 1];

  if (subcommand !== "resolve" || !specifier || !from) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const output = await describeResolution(specifier, {
    parentURL: pathToFileURL(from).href,
  });
  process.stdout.write(`${output}\n`);
}

async function runNode(args: string[]) {
  await spawnAndExit(process.execPath, [...registerFlags(), ...args]);
}

async function runTsx(args: string[]) {
  const flags = registerFlags();
  await spawnAndExit(process.execPath, [
    ...flags,
    ...tsxImportFlags(flags),
    ...args,
  ]);
}

async function runBinary(binary: string, args: string[]) {
  const binaryPath = resolveBinary(binary);
  await spawnAndExit(process.execPath, [
    ...registerFlags(),
    binaryPath,
    ...args,
  ]);
}

function registerFlags() {
  const registerEntry = registerEntryPath();
  return registerEntry.endsWith(".ts")
    ? ["--import=tsx", `--import=${registerEntry}`]
    : [`--import=${registerEntry}`];
}

function tsxImportFlags(existingFlags: string[]) {
  return existingFlags.includes("--import=tsx") ? [] : ["--import=tsx"];
}

function registerEntryPath() {
  const built = new URL("../node/register.mjs", import.meta.url);
  if (pathExistsSync(fileURLToPath(built))) return built.pathname;

  return new URL("../node/register.ts", import.meta.url).pathname;
}

function spawnAndExit(command: string, args: string[]) {
  return new Promise<void>((resolve) => {
    const child = unifiedSpawn(command, args, {
      stdio: "inherit",
      env: process.env,
    });

    const signalHandlers = new Map<NodeJS.Signals, () => void>();
    for (const signal of exitSignals) {
      const handler = () => {
        child.kill(signal);
      };
      signalHandlers.set(signal, handler);
      process.once(signal, handler);
    }

    const cleanupSignalHandlers = () => {
      for (const [signal, handler] of signalHandlers) {
        process.off(signal, handler);
      }
    };

    child.on("close", (code, signal) => {
      cleanupSignalHandlers();

      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      process.exitCode = code ?? 1;
      resolve();
    });
  });
}

function printUsage() {
  process.stderr.write(`Usage:
  mrp debug resolve <specifier> --from <file>
  mrp node [node args...]
  mrp tsx <file> [args...]
  mrp vite [vite args...]
`);
}

function resolveBinary(binary: string) {
  if (binary === "tsx") {
    return resolveFromCwd("tsx/cli");
  }

  if (binary === "vite") {
    return resolvePackageBin("vite", "vite");
  }

  throw new Error(`Unsupported binary: ${binary}`);
}

function resolvePackageBin(packageName: string, binName: string) {
  const require = createCwdRequire();
  const packageJsonPath = require.resolve(`${packageName}/package.json`);
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    bin?: string | Record<string, string>;
  };
  const bin =
    typeof packageJson.bin === "string"
      ? packageJson.bin
      : packageJson.bin?.[binName];

  if (!bin) {
    throw new Error(`Package ${packageName} does not expose a ${binName} bin`);
  }

  return join(packageJsonPath, "..", bin);
}

function resolveFromCwd(id: string) {
  return createCwdRequire().resolve(id);
}

function createCwdRequire() {
  const cwdPackageJson = join(process.cwd(), "package.json");
  return createRequire(
    pathExistsSync(cwdPackageJson) ? cwdPackageJson : import.meta.url,
  );
}

main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(
    error instanceof Error ? `${error.stack}\n` : `${error}\n`,
  );
  process.exitCode = 1;
});
