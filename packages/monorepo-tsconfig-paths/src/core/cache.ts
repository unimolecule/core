import { LRUCache } from "lru-cache";
import type { CompiledPathPattern } from "./matcher.ts";
import type { LoadedTsconfig, PackageConfig } from "./types.ts";

export const RESOLVER_CACHE_LIMITS = {
  packageConfig: 512,
  tsconfigPath: 512,
  tsconfig: 256,
  matcher: 256,
  fileProbe: 2048,
} as const;

export const RESOLVER_CACHE_TTLS = {
  packageConfig: 60_000,
  tsconfigPath: 60_000,
  tsconfig: 5_000,
  matcher: 5_000,
  fileProbe: 250,
} as const;

export const packageConfigCache = new LRUCache<string, PackageConfig | false>({
  max: RESOLVER_CACHE_LIMITS.packageConfig,
  ttl: RESOLVER_CACHE_TTLS.packageConfig,
});

export const tsconfigPathCache = new LRUCache<string, string | false>({
  max: RESOLVER_CACHE_LIMITS.tsconfigPath,
  ttl: RESOLVER_CACHE_TTLS.tsconfigPath,
});

export const tsconfigCache = new LRUCache<string, LoadedTsconfig>({
  max: RESOLVER_CACHE_LIMITS.tsconfig,
  ttl: RESOLVER_CACHE_TTLS.tsconfig,
});

export const matcherCache = new LRUCache<string, CompiledPathPattern[]>({
  max: RESOLVER_CACHE_LIMITS.matcher,
  ttl: RESOLVER_CACHE_TTLS.matcher,
});

export const fileProbeCache = new LRUCache<string, boolean>({
  max: RESOLVER_CACHE_LIMITS.fileProbe,
  ttl: RESOLVER_CACHE_TTLS.fileProbe,
});

export function clearResolverCache() {
  packageConfigCache.clear();
  tsconfigPathCache.clear();
  tsconfigCache.clear();
  matcherCache.clear();
  fileProbeCache.clear();
}

export function getResolverCacheStats() {
  return {
    packageConfig: cacheStats(packageConfigCache),
    tsconfigPath: cacheStats(tsconfigPathCache),
    tsconfig: cacheStats(tsconfigCache),
    matcher: cacheStats(matcherCache),
    fileProbe: cacheStats(fileProbeCache),
  };
}

function cacheStats(cache: { readonly max: number; readonly size: number }) {
  return {
    max: cache.max,
    size: cache.size,
  };
}
