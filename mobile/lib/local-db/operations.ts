import * as Crypto from "expo-crypto";
import { getDatabase } from "./database";
import { applyOp } from "./materializer";
import { useLocalDbStore } from "@/lib/store/local-db-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { getDeviceId } from "@/lib/sync/device-id";
import type { OpType, OpPayload, Operation } from "./types";

/** Tables affected by each op type — used to bump the right Zustand versions */
const AFFECTED_TABLES: Record<OpType, string[]> = {
  add_cabinet: ["cabinets"],
  update_cabinet: ["cabinets"],
  delete_cabinet: ["cabinets", "shelves", "items"],
  add_shelf: ["shelves"],
  update_shelf: ["shelves"],
  delete_shelf: ["shelves", "items"],
  add_item: ["items"],
  update_item: ["items"],
  delete_item: ["items"],
  batch_add_items: ["items"],
  move_item: ["items"],
};

let seqCounter = 0;

/**
 * Initializes the sequence counter from the highest existing seq
 * in pending_ops. Call once on app start.
 */
export function initSeqCounter(): void {
  const db = getDatabase();
  const row = db.getFirstSync<{ max_seq: number | null }>(
    `SELECT MAX(seq) AS max_seq FROM pending_ops`,
  );
  seqCounter = row?.max_seq ?? 0;
}

/**
 * Creates an operation, applies it to the local SQLite database,
 * and queues it in pending_ops for sync.
 *
 * This is the primary write path for all inventory mutations.
 * The UI sees the change immediately (optimistic by nature).
 *
 * @returns The created operation (for testing/debugging)
 */
export async function writeOp(
  type: OpType,
  payload: OpPayload,
  locationId: string,
): Promise<Operation> {
  const db = getDatabase();
  const userId = useAuthStore.getState().user?.id;
  if (!userId) throw new Error("Not authenticated");

  const deviceId = await getDeviceId();
  seqCounter += 1;

  const op: Operation = {
    id: Crypto.randomUUID(),
    seq: seqCounter,
    timestamp: new Date().toISOString(),
    userId,
    deviceId,
    locationId,
    type,
    payload,
  };

  db.withTransactionSync(() => {
    // 1. Queue the op for sync
    db.runSync(
      `INSERT INTO pending_ops (id, location_id, seq, timestamp, user_id, device_id, type, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [op.id, op.locationId, op.seq, op.timestamp, op.userId, op.deviceId, op.type, JSON.stringify(op.payload)],
    );

    // 2. Apply to materialized tables
    applyOp(db, op);
  });

  // 3. Bump Zustand version counters for affected tables → triggers re-renders
  const { bumpTable, setPendingCount } = useLocalDbStore.getState();
  for (const table of AFFECTED_TABLES[type]) {
    bumpTable(table);
  }

  // 4. Update pending count for sync status UI
  const pendingRow = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM pending_ops WHERE location_id = ?`,
    [locationId],
  );
  setPendingCount(locationId, pendingRow?.cnt ?? 0);

  // 5. Schedule a debounced push to sync changes to remote
  const { schedulePush } = useLocalDbStore.getState();
  if (schedulePush) schedulePush(locationId);

  return op;
}

/**
 * Returns all pending ops for a location, ordered by seq.
 * Used by the sync engine to push ops to remote.
 */
export function getPendingOps(locationId: string): Operation[] {
  const db = getDatabase();
  const rows = db.getAllSync<{
    id: string;
    location_id: string;
    seq: number;
    timestamp: string;
    user_id: string;
    device_id: string;
    type: string;
    payload: string;
  }>(
    `SELECT * FROM pending_ops WHERE location_id = ? ORDER BY seq ASC`,
    [locationId],
  );

  return rows.map((row) => ({
    id: row.id,
    seq: row.seq,
    timestamp: row.timestamp,
    userId: row.user_id,
    deviceId: row.device_id,
    locationId: row.location_id,
    type: row.type as OpType,
    payload: JSON.parse(row.payload),
  }));
}

/**
 * Removes ops from pending_ops after they've been successfully pushed.
 * Called by the sync engine after a confirmed push.
 */
export function clearPendingOps(opIds: string[]): void {
  if (opIds.length === 0) return;
  const db = getDatabase();
  const placeholders = opIds.map(() => "?").join(", ");
  db.runSync(`DELETE FROM pending_ops WHERE id IN (${placeholders})`, opIds);
}
