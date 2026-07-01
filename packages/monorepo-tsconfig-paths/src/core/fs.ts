import fs from "node:fs";
import { dirname, parse, resolve } from "node:path";
import { pathExistsSync } from "@unimolecule/utils/node/path-exists";

export function fileExists(path: string) {
  try {
    return fs.statSync(path).isFile();
  } catch {
    return false;
  }
}

export function readJsonFile(path: string) {
  return JSON.parse(
    stripJsonComments(fs.readFileSync(path, "utf8")),
  ) as unknown;
}

export function findUp(name: string, from: string, stopAt?: string) {
  let current = from;

  while (true) {
    const candidate = resolve(current, name);
    if (pathExistsSync(candidate)) return candidate;
    if (stopAt && current === stopAt) return;

    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

function stripJsonComments(source: string) {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (
        index < source.length &&
        (source[index] !== "*" || source[index + 1] !== "/")
      ) {
        if (source[index] === "\n") output += "\n";
        index += 1;
      }
      index += 1;
      continue;
    }

    output += char;
  }

  return output.replaceAll(/,\s*([}\]])/g, "$1");
}

export function appendExtensions(path: string, extensions: readonly string[]) {
  const extension = parse(path).ext;
  if (extension) return [path];
  return [
    path,
    ...extensions.map((candidateExtension) => path + candidateExtension),
  ];
}
