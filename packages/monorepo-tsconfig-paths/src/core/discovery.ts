import { dirname, isAbsolute, resolve } from "node:path";
import { pathExistsSync } from "@unimolecule/utils/node/path-exists";
import {
  packageConfigCache,
  tsconfigCache,
  tsconfigPathCache,
} from "./cache.ts";
import { DEFAULT_CONFIG_NAMES, DEFAULT_EXTENSIONS } from "./defaults.ts";
import { findUp, readJsonFile } from "./fs.ts";
import type { LoadedTsconfig, PackageConfig } from "./types.ts";

interface PackageJson {
  monorepoTsconfigPaths?: false | { tsconfig?: string };
}

export function findNearestPackage(
  importerPath: string,
): PackageConfig | undefined {
  const cached = packageConfigCache.get(importerPath);
  if (cached !== undefined) return cached || undefined;

  const packageJsonPath = findUp("package.json", dirname(importerPath));
  if (!packageJsonPath) {
    packageConfigCache.set(importerPath, false);
    return undefined;
  }

  const packageRoot = dirname(packageJsonPath);
  const packageJson = readJsonFile(packageJsonPath) as PackageJson;

  if (packageJson.monorepoTsconfigPaths === false) {
    packageConfigCache.set(importerPath, false);
    return undefined;
  }

  const packageConfig = {
    root: packageRoot,
    packageJsonPath,
    tsconfigName:
      packageJson.monorepoTsconfigPaths &&
      typeof packageJson.monorepoTsconfigPaths === "object" &&
      packageJson.monorepoTsconfigPaths.tsconfig
        ? packageJson.monorepoTsconfigPaths.tsconfig
        : DEFAULT_CONFIG_NAMES[0],
  };

  packageConfigCache.set(importerPath, packageConfig);
  return packageConfig;
}

export function findProjectTsconfig(packageConfig: PackageConfig) {
  const cacheKey = `${packageConfig.root}\0${packageConfig.tsconfigName}`;
  const cached = tsconfigPathCache.get(cacheKey);
  if (cached !== undefined) return cached || undefined;

  const configuredPath = resolve(
    packageConfig.root,
    packageConfig.tsconfigName,
  );
  if (pathExistsSync(configuredPath)) {
    tsconfigPathCache.set(cacheKey, configuredPath);
    return configuredPath;
  }

  for (const configName of DEFAULT_CONFIG_NAMES) {
    const candidate = resolve(packageConfig.root, configName);
    if (pathExistsSync(candidate)) {
      tsconfigPathCache.set(cacheKey, candidate);
      return candidate;
    }
  }

  tsconfigPathCache.set(cacheKey, false);
  return;
}

export function loadTsconfig(tsconfigPath: string): LoadedTsconfig {
  const cached = tsconfigCache.get(tsconfigPath);
  if (cached) return cached;

  const parsed = readJsonFile(tsconfigPath) as {
    extends?: string | string[];
    compilerOptions?: LoadedTsconfig["compilerOptions"];
  };

  const extendedConfigs = [parsed.extends ?? []].flat();
  const merged = extendedConfigs.reduce<LoadedTsconfig>(
    (config, extendedPath) => {
      const resolvedExtends = resolveExtendsPath(extendedPath, tsconfigPath);
      if (!resolvedExtends) return config;
      const extendedConfig = loadTsconfig(resolvedExtends);
      return mergeTsconfig(config, extendedConfig);
    },
    { path: tsconfigPath, compilerOptions: {} },
  );

  const config = mergeTsconfig(merged, {
    path: tsconfigPath,
    compilerOptions: parsed.compilerOptions ?? {},
  });
  config.cacheFingerprint = createTsconfigFingerprint(config);

  tsconfigCache.set(tsconfigPath, config);
  return config;
}

function mergeTsconfig(
  base: LoadedTsconfig,
  override: LoadedTsconfig,
): LoadedTsconfig {
  return {
    path: override.path,
    compilerOptions: {
      ...base.compilerOptions,
      ...override.compilerOptions,
      paths: {
        ...base.compilerOptions.paths,
        ...override.compilerOptions.paths,
      },
    },
  };
}

function resolveExtendsPath(extendsPath: string, tsconfigPath: string) {
  if (!extendsPath.startsWith(".") && !isAbsolute(extendsPath)) {
    return;
  }

  const absolutePath = isAbsolute(extendsPath)
    ? extendsPath
    : resolve(dirname(tsconfigPath), extendsPath);

  for (const candidate of [
    absolutePath,
    ...DEFAULT_EXTENSIONS.map((extension) => absolutePath + extension),
    resolve(absolutePath, "tsconfig.json"),
  ]) {
    if (pathExistsSync(candidate)) return candidate;
  }

  return;
}

function createTsconfigFingerprint(config: LoadedTsconfig) {
  return JSON.stringify({
    baseUrl: config.compilerOptions.baseUrl,
    paths: config.compilerOptions.paths,
  });
}
