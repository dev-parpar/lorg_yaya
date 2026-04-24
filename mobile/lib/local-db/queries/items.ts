import type { SQLiteDatabase } from "expo-sqlite";
import type { Item, ItemType } from "@/types";
import type { LocalItemRow } from "../types";

function toItem(row: LocalItemRow): Item {
  return {
    id: row.id,
    cabinetId: row.cabinet_id,
    shelfId: row.shelf_id,
    name: row.name,
    description: row.description,
    quantity: row.quantity,
    itemType: row.item_type as ItemType,
    imagePath: row.image_path,
    signedImageUrl: row.signed_image_url,
    tags: JSON.parse(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/**
 * Get items for a cabinet, optionally filtered to a specific shelf.
 * shelfFilter values:
 *   undefined  → all items in the cabinet
 *   null       → only unassigned items (no shelf)
 *   string     → items on that specific shelf
 */
export function getItems(
  db: SQLiteDatabase,
  cabinetId: string,
  shelfFilter?: string | null,
): Item[] {
  if (shelfFilter === undefined) {
    return db
      .getAllSync<LocalItemRow>(
        `SELECT * FROM items
         WHERE cabinet_id = ? AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [cabinetId],
      )
      .map(toItem);
  }

  if (shelfFilter === null) {
    return db
      .getAllSync<LocalItemRow>(
        `SELECT * FROM items
         WHERE cabinet_id = ? AND shelf_id IS NULL AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [cabinetId],
      )
      .map(toItem);
  }

  return db
    .getAllSync<LocalItemRow>(
      `SELECT * FROM items
       WHERE cabinet_id = ? AND shelf_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [cabinetId, shelfFilter],
    )
    .map(toItem);
}

export function getItem(db: SQLiteDatabase, itemId: string): Item | null {
  const row = db.getFirstSync<LocalItemRow>(
    `SELECT * FROM items WHERE id = ? AND deleted_at IS NULL`,
    [itemId],
  );
  return row ? toItem(row) : null;
}

/**
 * Full-text search across items using SQLite FTS5.
 * Searches name, description, and tags.
 * Results include cabinet and location context for breadcrumbs.
 */
export function searchItems(
  db: SQLiteDatabase,
  query: string,
  limit: number = 50,
): Array<Item & { cabinetName: string; locationId: string }> {
  if (query.length < 2) return [];

  // FTS5 query: prefix match for partial words
  const ftsQuery = query
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `${term}*`)
    .join(" ");

  const rows = db.getAllSync<
    LocalItemRow & { cabinet_name: string; location_id_join: string }
  >(
    `SELECT i.*, c.name AS cabinet_name, c.location_id AS location_id_join
     FROM items_fts
     JOIN items i ON items_fts.rowid = i.rowid
     JOIN cabinets c ON i.cabinet_id = c.id
     WHERE items_fts MATCH ? AND i.deleted_at IS NULL AND c.deleted_at IS NULL
     ORDER BY rank
     LIMIT ?`,
    [ftsQuery, limit],
  );

  return rows.map((row) => ({
    ...toItem(row),
    cabinetName: row.cabinet_name,
    locationId: row.location_id_join,
  }));
}
