import { resolve } from "node:path";
import { matcherCache } from "./cache.ts";
import type { LoadedTsconfig, ResolutionCandidate } from "./types.ts";

export interface MatchResult {
  pattern: string;
  candidates: ResolutionCandidate[];
}

export interface CompiledPathPattern {
  pattern: string;
  prefix: string;
  suffix: string;
  replacements: string[];
}

export function matchTsconfigPaths(
  specifier: string,
  tsconfig: LoadedTsconfig,
  extensions: readonly string[],
): MatchResult | undefined {
  const paths = tsconfig.compilerOptions.paths;
  if (!paths) return undefined;

  const baseUrl = resolve(
    tsconfig.path,
    "..",
    tsconfig.compilerOptions.baseUrl ?? ".",
  );

  const patterns = getCompiledPathPatterns(tsconfig, extensions);

  for (const pattern of patterns) {
    if (!patternMatches(pattern, specifier)) continue;

    const wildcard = specifier.slice(
      pattern.prefix.length,
      specifier.length - pattern.suffix.length,
    );
    const candidates = pattern.replacements.flatMap((replacement) =>
      expandCandidate(
        resolve(baseUrl, replacement.replace("*", wildcard)),
        extensions,
      ),
    );
    if (candidates.length > 0) {
      return {
        pattern: pattern.pattern,
        candidates: candidates.map((path) => ({ path, exists: false })),
      };
    }
  }

  return undefined;
}

function getCompiledPathPatterns(
  tsconfig: LoadedTsconfig,
  extensions: readonly string[],
) {
  const paths = tsconfig.compilerOptions.paths;
  if (!paths) return [];

  const cacheKey = `${tsconfig.path}\0${tsconfig.cacheFingerprint ?? ""}\0${extensions.join("\0")}`;
  const cached = matcherCache.get(cacheKey);
  if (cached) return cached;

  const patterns = Object.entries(paths)
    .map(([pattern, replacements]) => ({
      ...parsePattern(pattern),
      replacements,
    }))
    .toSorted((left, right) => right.prefix.length - left.prefix.length);

  matcherCache.set(cacheKey, patterns);
  return patterns;
}

function parsePattern(pattern: string) {
  const starIndex = pattern.indexOf("*");
  if (starIndex === -1) {
    return {
      pattern,
      prefix: pattern,
      suffix: "",
    };
  }

  return {
    pattern,
    prefix: pattern.slice(0, starIndex),
    suffix: pattern.slice(starIndex + 1),
  };
}

function patternMatches(pattern: CompiledPathPattern, specifier: string) {
  if (!pattern.pattern.includes("*")) return pattern.pattern === specifier;
  return (
    specifier.startsWith(pattern.prefix) && specifier.endsWith(pattern.suffix)
  );
}

function expandCandidate(path: string, extensions: readonly string[]) {
  const candidates = [path];

  if (!extensions.some((extension) => path.endsWith(extension))) {
    candidates.push(...extensions.map((extension) => path + extension));
  }

  candidates.push(
    ...extensions.map((extension) => resolve(path, `index${extension}`)),
  );

  return candidates;
}
