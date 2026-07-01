import {
  registerHooks,
  type ModuleHooks,
  type ResolveHookSync,
} from "node:module";
import {
  clearResolverCache,
  resolveTsconfigPathSync,
} from "../core/resolver.ts";

let activeRegistration: ModuleHooks | undefined;
let activeHooks: ModuleHooks | undefined;

const resolveHook: ResolveHookSync = (specifier, context, nextResolve) => {
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

export function registerMonorepoTsconfigPaths(): ModuleHooks {
  if (activeHooks) return activeHooks;

  const registration = registerHooks({
    resolve: resolveHook,
  });

  activeRegistration = registration;
  activeHooks = {
    deregister() {
      if (activeRegistration !== registration) return;

      registration.deregister();
      activeRegistration = undefined;
      activeHooks = undefined;
      clearResolverCache();
    },
  };

  return activeHooks;
}

export function deregisterMonorepoTsconfigPaths() {
  activeHooks?.deregister();
}

registerMonorepoTsconfigPaths();
