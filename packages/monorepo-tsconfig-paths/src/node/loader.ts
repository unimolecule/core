import { resolveTsconfigPathSync } from "../core/resolver.ts";
import type { ResolveHook } from "node:module";

export const resolve: ResolveHook = (specifier, context, nextResolve) => {
  const resolution = resolveTsconfigPathSync(specifier, {
    parentURL: context.parentURL ?? "",
  });

  if (resolution.status === "resolved") {
    return {
      shortCircuit: true,
      url: resolution.url,
    };
  }

  return nextResolve(specifier, context);
};
