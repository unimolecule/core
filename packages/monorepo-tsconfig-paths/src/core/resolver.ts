import { builtinModules } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  clearResolverCache,
  fileProbeCache,
  getResolverCacheStats,
  RESOLVER_CACHE_LIMITS,
  RESOLVER_CACHE_TTLS,
} from "./cache.ts";
import { DEFAULT_EXTENSIONS } from "./defaults.ts";
import {
  findNearestPackage,
  findProjectTsconfig,
  loadTsconfig,
} from "./discovery.ts";
import { fileExists } from "./fs.ts";
import { matchTsconfigPaths } from "./matcher.ts";
import type {
  ResolveTsconfigPathOptions,
  TsconfigPathResolution,
} from "./types.ts";

const builtins = new Set([
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
]);

export function resolveTsconfigPath(
  specifier: string,
  options: ResolveTsconfigPathOptions,
): Promise<TsconfigPathResolution> {
  return Promise.resolve(resolveTsconfigPathSync(specifier, options));
}

export function resolveTsconfigPathSync(
  specifier: string,
  options: ResolveTsconfigPathOptions,
): TsconfigPathResolution {
  if (isIgnoredSpecifier(specifier)) {
    return {
      status: "not-handled",
      specifier,
      reason:
        "specifier is relative, absolute, URL, builtin, or package import",
    };
  }

  if (!options.parentURL || !options.parentURL.startsWith("file:")) {
    return {
      status: "not-handled",
      specifier,
      reason: "parentURL is not a file URL",
    };
  }

  const importerPath = fileURLToPath(options.parentURL);
  const packageConfig = findNearestPackage(importerPath);

  if (!packageConfig) {
    return {
      status: "not-handled",
      specifier,
      importerPath,
      reason: "no package root or package opted out",
    };
  }

  const tsconfigPath = findProjectTsconfig(packageConfig);
  if (!tsconfigPath) {
    return {
      status: "not-handled",
      specifier,
      importerPath,
      packageRoot: packageConfig.root,
      reason: "no tsconfig found for package",
    };
  }

  const tsconfig = loadTsconfig(tsconfigPath);
  const match = matchTsconfigPaths(
    specifier,
    tsconfig,
    options.extensions ?? DEFAULT_EXTENSIONS,
  );

  if (!match) {
    return {
      status: "not-handled",
      specifier,
      importerPath,
      packageRoot: packageConfig.root,
      tsconfigPath,
      reason: "no matching tsconfig paths pattern",
    };
  }

  let resolvedPath: string | undefined;
  for (const candidate of match.candidates) {
    if (cachedFileExists(candidate.path)) {
      resolvedPath = candidate.path;
      break;
    }
  }

  const candidates = options.diagnostics
    ? match.candidates.map((candidate) => ({
        ...candidate,
        exists: cachedFileExists(candidate.path),
      }))
    : undefined;

  if (!resolvedPath) {
    return {
      status: "not-handled",
      specifier,
      importerPath,
      packageRoot: packageConfig.root,
      tsconfigPath,
      reason: "no candidate file exists",
      ...(candidates && { candidates }),
    };
  }

  return {
    status: "resolved",
    specifier,
    importerPath,
    packageRoot: packageConfig.root,
    tsconfigPath,
    matchedPattern: match.pattern,
    resolvedPath,
    url: pathToFileURL(resolvedPath).href,
    candidates: candidates ?? [{ path: resolvedPath, exists: true }],
  };
}

export {
  clearResolverCache,
  getResolverCacheStats,
  RESOLVER_CACHE_LIMITS,
  RESOLVER_CACHE_TTLS,
};

function isIgnoredSpecifier(specifier: string) {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("#") ||
    builtins.has(specifier)
  ) {
    return true;
  }

  if (isUrlLikeSpecifier(specifier)) return true;

  return isBarePackageImport(specifier);
}

function isBarePackageImport(specifier: string) {
  const parts = specifier.split("/");
  if (specifier.startsWith("@")) return parts.length >= 2 && parts[0] !== "@";
  return !specifier.includes("/");
}

function isUrlLikeSpecifier(specifier: string) {
  const colonIndex = specifier.indexOf(":");
  if (colonIndex <= 0) return false;

  for (let index = 0; index < colonIndex; index += 1) {
    const char = specifier.codePointAt(index);
    if (char === undefined) return false;

    const isSchemeChar =
      (char >= 65 && char <= 90) ||
      (char >= 97 && char <= 122) ||
      (char >= 48 && char <= 57) ||
      char === 43 ||
      char === 45 ||
      char === 46;
    if (!isSchemeChar) return false;
  }

  return true;
}

function cachedFileExists(path: string) {
  const cached = fileProbeCache.get(path);
  if (cached !== undefined) return cached;

  const exists = fileExists(path);
  fileProbeCache.set(path, exists);
  return exists;
}
