import path from "node:path";
import { resolveTsconfigPath } from "../core/resolver.ts";
import type { ResolveTsconfigPathOptions } from "../core/types.ts";

export async function describeResolution(
  specifier: string,
  options: ResolveTsconfigPathOptions,
) {
  const resolution = await resolveTsconfigPath(specifier, {
    ...options,
    diagnostics: true,
  });
  const cwd = findCommonRoot(
    [
      resolution.importerPath,
      resolution.packageRoot,
      resolution.tsconfigPath,
      ...(resolution.candidates ?? []).map((candidate) => candidate.path),
    ].filter(Boolean) as string[],
  );

  const lines = [
    `specifier: ${specifier}`,
    resolution.importerPath &&
      `importer: ${formatPath(resolution.importerPath, cwd)}`,
    resolution.packageRoot &&
      `package root: ${formatPath(resolution.packageRoot, cwd)}`,
    resolution.tsconfigPath &&
      `tsconfig: ${formatPath(resolution.tsconfigPath, cwd)}`,
    resolution.status === "resolved" &&
      `matched path: ${resolution.matchedPattern}`,
    ...(resolution.candidates ?? []).map(
      (candidate) => `candidate: ${formatPath(candidate.path, cwd)}`,
    ),
    `result: ${resolution.status === "resolved" ? "resolved" : "not handled"}`,
    resolution.status === "not-handled" && `reason: ${resolution.reason}`,
  ];

  return lines.filter(Boolean).join("\n");
}

function formatPath(filePath: string, root: string) {
  const workspaceRelative = formatWorkspaceRelativePath(filePath);
  if (workspaceRelative) return workspaceRelative;

  const relative = path.relative(root, filePath);
  return relative && !relative.startsWith("..") ? relative : filePath;
}

function formatWorkspaceRelativePath(filePath: string) {
  const parts = path.resolve(filePath).split(path.sep);
  const boundaryIndex = parts.findIndex(
    (part) => part === "packages" || part === "apps",
  );

  return boundaryIndex === -1
    ? undefined
    : parts.slice(boundaryIndex).join(path.sep);
}

function findCommonRoot(paths: string[]) {
  if (paths.length === 0) return process.cwd();

  const [firstPath, ...restPaths] = paths.map((filePath) =>
    path.resolve(filePath).split(path.sep),
  );

  const commonSegments: string[] = [];
  for (const [index, segment] of firstPath.entries()) {
    if (restPaths.every((parts) => parts[index] === segment)) {
      commonSegments.push(segment);
    } else {
      break;
    }
  }

  return commonSegments.length > 1 ? commonSegments.join(path.sep) : path.sep;
}
