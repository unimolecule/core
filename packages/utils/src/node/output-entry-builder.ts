import { readdirSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

type EntryIgnore =
  | string
  | RegExp
  | ((file: {
      path: string;
      absolutePath: string;
      isDirectory: boolean;
    }) => boolean);

type EntryMode = "all" | "index";

interface ScanEntryOptions {
  cwd?: string;
  entries?: EntryMode;
  extensions?: readonly string[];
  ignore?: readonly EntryIgnore[];
}

function toPosixPath(value: string) {
  return value.split(sep).join("/");
}

export function outputEntryBuilder(
  rootDir: string,
  options: ScanEntryOptions = {},
): Record<string, string> {
  const cwd = options.cwd ?? process.cwd();
  const entryMode = options.entries ?? "all";
  const extensions = options.extensions ?? [".ts"];
  const ignore = options.ignore ?? [];
  const root = resolve(cwd, rootDir);
  const entries: Record<string, string> = {};

  function shouldIgnore(
    relativePath: string,
    absolutePath: string,
    isDirectory: boolean,
  ) {
    return ignore.some((rule) => {
      if (typeof rule === "function") {
        return rule({ path: relativePath, absolutePath, isDirectory });
      }

      if (rule instanceof RegExp) {
        return rule.test(relativePath);
      }

      const normalizedRule = rule.replaceAll("\\", "/").replace(/\/$/, "");
      return (
        relativePath === normalizedRule ||
        relativePath.startsWith(`${normalizedRule}/`)
      );
    });
  }

  function visit(dir: string) {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const absolutePath = resolve(dir, item.name);
      const relativePath = toPosixPath(relative(root, absolutePath));
      const isDirectory = item.isSymbolicLink()
        ? statSync(absolutePath).isDirectory()
        : item.isDirectory();

      if (shouldIgnore(relativePath, absolutePath, isDirectory)) {
        continue;
      }

      if (isDirectory) {
        visit(absolutePath);
        continue;
      }

      const extension = extensions.find((ext) => relativePath.endsWith(ext));
      if (!extension) {
        continue;
      }

      if (
        entryMode === "index" &&
        !relativePath.endsWith(`index${extension}`)
      ) {
        continue;
      }

      const entryName = relativePath.slice(0, -extension.length);
      entries[entryName] = `./${toPosixPath(relative(cwd, absolutePath))}`;
    }
  }

  visit(root);
  return entries;
}
