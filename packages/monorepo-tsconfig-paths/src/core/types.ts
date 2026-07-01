export type ProjectDiscovery = "nearest-package" | "nearest-tsconfig";

export interface ResolveTsconfigPathOptions {
  parentURL: string;
  configNames?: string[];
  extensions?: string[];
  projectDiscovery?: ProjectDiscovery;
  diagnostics?: boolean;
}

export interface ResolutionCandidate {
  path: string;
  exists: boolean;
}

export interface ResolvedTsconfigPath {
  status: "resolved";
  specifier: string;
  importerPath: string;
  packageRoot: string;
  tsconfigPath: string;
  matchedPattern: string;
  resolvedPath: string;
  url: string;
  candidates: ResolutionCandidate[];
}

export interface NotHandledTsconfigPath {
  status: "not-handled";
  specifier: string;
  reason: string;
  importerPath?: string;
  packageRoot?: string;
  tsconfigPath?: string;
  candidates?: ResolutionCandidate[];
}

export type TsconfigPathResolution =
  ResolvedTsconfigPath | NotHandledTsconfigPath;

export interface PackageConfig {
  root: string;
  packageJsonPath: string;
  tsconfigName: string;
}

export interface LoadedTsconfig {
  path: string;
  cacheFingerprint?: string;
  compilerOptions: {
    baseUrl?: string;
    paths?: Record<string, string[]>;
  };
}
