import { createHash } from 'node:crypto';

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, canonicalize(record[key])]),
    );
  }
  return value;
};

/** Deterministic SHA-256 of a payload, independent of property order. */
export const hashRequest = (payload: unknown): string =>
  createHash('sha256').update(JSON.stringify(canonicalize(payload))).digest('hex');