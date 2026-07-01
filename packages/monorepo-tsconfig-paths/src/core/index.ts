export {
  clearResolverCache,
  getResolverCacheStats,
  RESOLVER_CACHE_LIMITS,
  RESOLVER_CACHE_TTLS,
  resolveTsconfigPath,
  resolveTsconfigPathSync,
} from "./resolver.ts";
export type {
  NotHandledTsconfigPath,
  ProjectDiscovery,
  ResolvedTsconfigPath,
  ResolveTsconfigPathOptions,
  TsconfigPathResolution,
} from "./types.ts";
