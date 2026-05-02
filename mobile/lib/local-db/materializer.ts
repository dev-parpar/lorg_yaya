import type { SQLiteDatabase, SQLiteBindValue } from "expo-sqlite";
import type {
  Operation,
  AddCabinetPayload,
  UpdateCabinetPayload,
  DeleteCabinetPayload,
  AddShelfPayload,
  UpdateShelfPayload,
  DeleteShelfPayload,
  AddItemPayload,
  UpdateItemPayload,
  DeleteItemPayload,
  BatchAddItemsPayload,
  MoveItemPayload,
} from "./types";

/** Map camelCase field names to snake_case column names */
const COLUMN_MAP: Record<string, string> = {
  name: "name",
  description: "description",
  imagePath: "image_path",
  signedImageUrl: "signed_image_url",
  position: "position",
  quantity: "quantity",
  itemType: "item_type",
  shelfId: "shelf_id",
  tags: "tags",
};

function toColumnName(key: string): string {
  return COLUMN_MAP[key] ?? key;
}

/**
 * Applies a single operation to the materialized SQLite tables.
 * Must be called within a transaction for atomicity when applying
 * multiple ops (e.g., during a sync pull).
 *
 * Key behaviors:
 * - INSERT OR IGNORE for add ops (idempotent — replaying is safe)
 * - Sparse updates (only changed fields)
 * - Soft-delete via deleted_at (not physical delete)
 * - Cascade info embedded in delete payloads
 */
export function applyOp(db: SQLiteDatabase, op: Operation): void {
  const ts = op.timestamp;

  switch (op.type) {
    case "add_cabinet": {
      const p = op.payload as AddCabinetPayload;
      db.runSync(
        `INSERT OR IGNORE INTO cabinets
         (id, location_id, name, description, image_path, signed_image_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.cabinetId, op.locationId, p.name, p.description, p.imagePath, p.signedImageUrl, ts, ts],
      );
      break;
    }

    case "update_cabinet": {
      const p = op.payload as UpdateCabinetPayload;
      const sets: string[] = [];
      const values: SQLiteBindValue[] = [];
      for (const [key, val] of Object.entries(p.changes)) {
        sets.push(`${toColumnName(key)} = ?`);
        values.push(val as SQLiteBindValue);
      }
      if (sets.length === 0) break;
      sets.push("updated_at = ?");
      values.push(ts, p.cabinetId);
      db.runSync(
        `UPDATE cabinets SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
        values,
      );
      break;
    }

    case "delete_cabinet": {
      const p = op.payload as DeleteCabinetPayload;
      db.runSync(
        `UPDATE cabinets SET deleted_at = ?, updated_at = ? WHERE id = ?`,
        [ts, ts, p.cabinetId],
      );
      for (const shelfId of p.cascadedShelfIds) {
        db.runSync(
          `UPDATE shelves SET deleted_at = ?, updated_at = ? WHERE id = ?`,
          [ts, ts, shelfId],
        );
      }
      for (const itemId of p.cascadedItemIds) {
        db.runSync(
          `UPDATE items SET deleted_at = ?, updated_at = ? WHERE id = ?`,
          [ts, ts, itemId],
        );
      }
      break;
    }

    case "add_shelf": {
      const p = op.payload as AddShelfPayload;
      db.runSync(
        `INSERT OR IGNORE INTO shelves
         (id, cabinet_id, name, position, image_path, signed_image_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.shelfId, p.cabinetId, p.name, p.position, p.imagePath, p.signedImageUrl, ts, ts],
      );
      break;
    }

    case "update_shelf": {
      const p = op.payload as UpdateShelfPayload;
      const sets: string[] = [];
      const values: SQLiteBindValue[] = [];
      for (const [key, val] of Object.entries(p.changes)) {
        sets.push(`${toColumnName(key)} = ?`);
        values.push(val as SQLiteBindValue);
      }
      if (sets.length === 0) break;
      sets.push("updated_at = ?");
      values.push(ts, p.shelfId);
      db.runSync(
        `UPDATE shelves SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
        values,
      );
      break;
    }

    case "delete_shelf": {
      const p = op.payload as DeleteShelfPayload;
      db.runSync(
        `UPDATE shelves SET deleted_at = ?, updated_at = ? WHERE id = ?`,
        [ts, ts, p.shelfId],
      );
      // Orphan items to parent cabinet (remove shelf assignment)
      for (const itemId of p.orphanedItemIds) {
        db.runSync(
          `UPDATE items SET shelf_id = NULL, updated_at = ? WHERE id = ?`,
          [ts, itemId],
        );
      }
      break;
    }

    case "add_item": {
      const p = op.payload as AddItemPayload;
      db.runSync(
        `INSERT OR IGNORE INTO items
         (id, cabinet_id, shelf_id, name, description, quantity, item_type,
          image_path, signed_image_url, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.itemId, p.cabinetId, p.shelfId, p.name, p.description,
          p.quantity, p.itemType, p.imagePath, p.signedImageUrl,
          JSON.stringify(p.tags), ts, ts,
        ],
      );
      break;
    }

    case "update_item": {
      const p = op.payload as UpdateItemPayload;
      const sets: string[] = [];
      const values: SQLiteBindValue[] = [];
      for (const [key, val] of Object.entries(p.changes)) {
        const colValue = key === "tags" ? JSON.stringify(val) : val;
        sets.push(`${toColumnName(key)} = ?`);
        values.push(colValue as SQLiteBindValue);
      }
      if (sets.length === 0) break;
      sets.push("updated_at = ?");
      values.push(ts, p.itemId);
      db.runSync(
        `UPDATE items SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
        values,
      );
      break;
    }

    case "delete_item": {
      const p = op.payload as DeleteItemPayload;
      db.runSync(
        `UPDATE items SET deleted_at = ?, updated_at = ? WHERE id = ?`,
        [ts, ts, p.itemId],
      );
      break;
    }

    case "batch_add_items": {
      const p = op.payload as BatchAddItemsPayload;
      for (const item of p.items) {
        db.runSync(
          `INSERT OR IGNORE INTO items
           (id, cabinet_id, shelf_id, name, description, quantity, item_type,
            image_path, signed_image_url, tags, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)`,
          [
            item.itemId, p.cabinetId, p.shelfId, item.name,
            item.description, item.quantity, item.itemType,
            JSON.stringify(item.tags), ts, ts,
          ],
        );
      }
      break;
    }

    case "move_item": {
      const p = op.payload as MoveItemPayload;
      db.runSync(
        `UPDATE items SET cabinet_id = ?, shelf_id = ?, updated_at = ?
         WHERE id = ? AND deleted_at IS NULL`,
        [p.toCabinetId, p.toShelfId, ts, p.itemId],
      );
      break;
    }
  }
}

/**
 * Applies a batch of operations within a single transaction.
 * Used during sync pulls and migration imports.
 */
export function applyOps(db: SQLiteDatabase, ops: Operation[]): void {
  db.withTransactionSync(() => {
    for (const op of ops) {
      applyOp(db, op);
    }
  });
}
