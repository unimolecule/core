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

interface ScanEntryOptions {
  cwd?: string;
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
    for (const item of readdirSync(dir)) {
      const absolutePath = resolve(dir, item);
      const stat = statSync(absolutePath);
      const relativePath = toPosixPath(relative(root, absolutePath));

      if (shouldIgnore(relativePath, absolutePath, stat.isDirectory())) {
        continue;
      }

      if (stat.isDirectory()) {
        visit(absolutePath);
        continue;
      }

      const extension = extensions.find((ext) => relativePath.endsWith(ext));
      if (!extension) {
        continue;
      }

      const entryName = relativePath.slice(0, -extension.length);
      entries[entryName] = `./${toPosixPath(relative(cwd, absolutePath))}`;
    }
  }

  visit(root);
  return entries;
}
