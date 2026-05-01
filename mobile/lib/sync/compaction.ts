import type { SQLiteDatabase } from "expo-sqlite";
import * as Crypto from "expo-crypto";
import type { Operation, SyncManifest } from "@/lib/local-db/types";
import type { LocalCabinetRow, LocalShelfRow, LocalItemRow } from "@/lib/local-db/types";
import type { ItemType } from "@/types";

const COMPACTION_OP_THRESHOLD = 500;
const COMPACTION_DAYS_THRESHOLD = 30;

/**
 * Returns true if the manifest indicates compaction should run:
 *   - More than 500 ops in the log, OR
 *   - compactedAt is null (never compacted), OR
 *   - Last compaction was more than 30 days ago.
 */
export function shouldCompact(manifest: SyncManifest): boolean {
  if (manifest.opCount > COMPACTION_OP_THRESHOLD) return true;
  if (!manifest.compactedAt) return true;

  const lastCompacted = new Date(manifest.compactedAt).getTime();
  const thirtyDaysAgo =
    Date.now() - COMPACTION_DAYS_THRESHOLD * 24 * 60 * 60 * 1000;
  return lastCompacted < thirtyDaysAgo;
}

/**
 * Generate a compacted op log from the current materialized SQLite state.
 * Produces one add_* op per living (non-deleted) entity.
 *
 * The resulting ops use deviceId "compaction" so they are easily identified
 * and seq numbers start from 1.
 */
export function compactFromState(
  db: SQLiteDatabase,
  locationId: string,
  userId: string,
): Operation[] {
  const now = new Date().toISOString();
  const ops: Operation[] = [];
  let seq = 0;

  // ── Cabinets ──────────────────────────────────────────────────────────────

  const cabinetRows = db.getAllSync<LocalCabinetRow>(
    `SELECT * FROM cabinets WHERE location_id = ? AND deleted_at IS NULL`,
    [locationId],
  );

  for (const cabinet of cabinetRows) {
    seq += 1;
    ops.push({
      id: Crypto.randomUUID(),
      seq,
      timestamp: now,
      userId,
      deviceId: "compaction",
      locationId,
      type: "add_cabinet",
      payload: {
        cabinetId: cabinet.id,
        name: cabinet.name,
        description: cabinet.description,
        imagePath: cabinet.image_path,
        signedImageUrl: cabinet.signed_image_url,
      },
    });
  }

  // ── Shelves ───────────────────────────────────────────────────────────────

  const cabinetIds = cabinetRows.map((c) => c.id);

  if (cabinetIds.length > 0) {
    const placeholders = cabinetIds.map(() => "?").join(", ");
    const shelfRows = db.getAllSync<LocalShelfRow>(
      `SELECT * FROM shelves WHERE cabinet_id IN (${placeholders}) AND deleted_at IS NULL`,
      cabinetIds,
    );

    for (const shelf of shelfRows) {
      seq += 1;
      ops.push({
        id: Crypto.randomUUID(),
        seq,
        timestamp: now,
        userId,
        deviceId: "compaction",
        locationId,
        type: "add_shelf",
        payload: {
          shelfId: shelf.id,
          cabinetId: shelf.cabinet_id,
          name: shelf.name,
          position: shelf.position,
          imagePath: shelf.image_path,
          signedImageUrl: shelf.signed_image_url,
        },
      });
    }

    // ── Items ─────────────────────────────────────────────────────────────

    const itemRows = db.getAllSync<LocalItemRow>(
      `SELECT * FROM items WHERE cabinet_id IN (${placeholders}) AND deleted_at IS NULL`,
      cabinetIds,
    );

    for (const item of itemRows) {
      seq += 1;
      ops.push({
        id: Crypto.randomUUID(),
        seq,
        timestamp: now,
        userId,
        deviceId: "compaction",
        locationId,
        type: "add_item",
        payload: {
          itemId: item.id,
          cabinetId: item.cabinet_id,
          shelfId: item.shelf_id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          itemType: item.item_type as ItemType,
          imagePath: item.image_path,
          signedImageUrl: item.signed_image_url,
          tags: JSON.parse(item.tags) as string[],
        },
      });
    }
  }

  return ops;
}
