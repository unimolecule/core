export {
  clearResolverCache,
  getResolverCacheStats,
  RESOLVER_CACHE_LIMITS,
  RESOLVER_CACHE_TTLS,
  resolveTsconfigPath,
  resolveTsconfigPathSync,
} from "./core/resolver.ts";
export { describeResolution } from "./diagnostics/debug.ts";
export type {
  NotHandledTsconfigPath,
  ProjectDiscovery,
  ResolvedTsconfigPath,
  ResolveTsconfigPathOptions,
  TsconfigPathResolution,
} from "./core/types.ts";
