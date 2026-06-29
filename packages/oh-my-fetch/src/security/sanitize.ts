import { isPlainObject } from "@unimolecule/utils";

export const UNSAFE_JSON_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

/**
 * Recursively remove JSON keys that can participate in prototype pollution.
 *
 * @example
 * ```ts
 * sanitizeJsonValue({ nested: { __proto__: { polluted: true }, ok: 1 } });
 * // { nested: { ok: 1 } }
 * ```
 */
export function sanitizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonValue);
  }
  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !UNSAFE_JSON_KEYS.has(key))
      .map(([key, item]) => [key, sanitizeJsonValue(item)]),
  );
}

/**
 * Remove unsafe JSON keys only from the top-level object.
 *
 * @example
 * ```ts
 * sanitizeJsonValueShallow({ __proto__: {}, ok: true });
 * // { ok: true }
 * ```
 */
export function sanitizeJsonValueShallow(value: unknown): unknown {
  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !UNSAFE_JSON_KEYS.has(key)),
  );
}
