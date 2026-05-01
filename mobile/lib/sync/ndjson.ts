import type { Operation } from "@/lib/local-db/types";

/**
 * Serialize an array of operations to an NDJSON string.
 * Each op is serialized as a single JSON object on its own line.
 */
export function serializeOps(ops: Operation[]): string {
  return ops.map((op) => JSON.stringify(op)).join("\n");
}

/**
 * Parse an NDJSON string back into an array of operations.
 * Blank lines are skipped. Corrupt lines are skipped with a console warning.
 */
export function parseOps(ndjson: string): Operation[] {
  const lines = ndjson.split("\n");
  const ops: Operation[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const op = JSON.parse(trimmed) as Operation;
      ops.push(op);
    } catch {
      console.warn("[ndjson] Skipping corrupt line:", trimmed.slice(0, 80));
    }
  }

  return ops;
}

/**
 * Sort operations into deterministic merge order: timestamp → deviceId → seq.
 * String comparison on timestamp is safe because they are ISO 8601.
 */
export function sortOps(ops: Operation[]): Operation[] {
  return [...ops].sort((a, b) => {
    if (a.timestamp < b.timestamp) return -1;
    if (a.timestamp > b.timestamp) return 1;
    if (a.deviceId < b.deviceId) return -1;
    if (a.deviceId > b.deviceId) return 1;
    return a.seq - b.seq;
  });
}
