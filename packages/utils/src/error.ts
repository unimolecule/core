/**
 * Error type used by utility helpers to prefix failures with a scope.
 */
class UnimoleculeError extends Error {
  constructor(m: string) {
    super(m);
    this.name = "UnimoleculeError";
  }
}

/**
 * Throw a scoped utility error and stop execution.
 */
export function throwError(scope: string, m: string): never {
  throw new UnimoleculeError(`[${scope}] ${m}`);
}
