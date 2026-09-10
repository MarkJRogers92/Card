export const CANONICAL_HASH_VERSION = "fnv1a64-utf8-v1" as const;

export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

function assertPlainObject(value: object): void {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Canonical values must use plain objects or arrays.");
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError("Canonical values cannot contain symbol keys.");
  }
}

function canonicalize(value: unknown, ancestors: Set<object>): string {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "string":
      return JSON.stringify(value);
    case "number": {
      if (!Number.isFinite(value)) {
        throw new TypeError("Canonical values cannot contain non-finite numbers.");
      }
      if (Object.is(value, -0)) {
        return "0";
      }
      return JSON.stringify(value);
    }
    case "object": {
      if (ancestors.has(value)) {
        throw new TypeError("Canonical values cannot contain cycles.");
      }

      ancestors.add(value);
      try {
        if (Array.isArray(value)) {
          const parts: string[] = [];
          for (let index = 0; index < value.length; index += 1) {
            if (!(index in value)) {
              throw new TypeError("Canonical arrays cannot be sparse.");
            }
            parts.push(canonicalize(value[index], ancestors));
          }
          return `[${parts.join(",")}]`;
        }

        assertPlainObject(value);
        const record = value as Record<string, unknown>;
        const keys = Object.keys(record).sort();
        const parts = keys.map((key) => {
          const item = record[key];
          if (item === undefined) {
            throw new TypeError("Canonical objects cannot contain undefined values.");
          }
          return `${JSON.stringify(key)}:${canonicalize(item, ancestors)}`;
        });
        return `{${parts.join(",")}}`;
      } finally {
        ancestors.delete(value);
      }
    }
    default:
      throw new TypeError(`Unsupported canonical value type: ${typeof value}.`);
  }
}

export function canonicalStringify(value: unknown): string {
  return canonicalize(value, new Set<object>());
}

function utf8Bytes(text: string): number[] {
  const bytes: number[] = [];
  for (const symbol of text) {
    const codePoint = symbol.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >>> 6));
      bytes.push(0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >>> 12));
      bytes.push(0x80 | ((codePoint >>> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(0xf0 | (codePoint >>> 18));
      bytes.push(0x80 | ((codePoint >>> 12) & 0x3f));
      bytes.push(0x80 | ((codePoint >>> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    }
  }
  return bytes;
}

export function hashCanonical(value: unknown): string {
  const canonical = canonicalStringify(value);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;

  for (const byte of utf8Bytes(canonical)) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & mask;
  }

  return `${CANONICAL_HASH_VERSION}:${hash.toString(16).padStart(16, "0")}`;
}
