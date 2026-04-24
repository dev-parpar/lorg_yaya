import type { SQLiteDatabase } from "expo-sqlite";
import type { Shelf, ShelfWithCounts } from "@/types";
import type { LocalShelfRow } from "../types";

function toShelf(row: LocalShelfRow): Shelf {
  return {
    id: row.id,
    cabinetId: row.cabinet_id,
    name: row.name,
    position: row.position,
    imagePath: row.image_path,
    signedImageUrl: row.signed_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function getShelves(db: SQLiteDatabase, cabinetId: string): ShelfWithCounts[] {
  const rows = db.getAllSync<LocalShelfRow & { item_count: number }>(
    `SELECT s.*,
       (SELECT COUNT(*) FROM items i WHERE i.shelf_id = s.id AND i.deleted_at IS NULL) AS item_count
     FROM shelves s
     WHERE s.cabinet_id = ? AND s.deleted_at IS NULL
     ORDER BY s.position ASC, s.created_at ASC`,
    [cabinetId],
  );

  return rows.map((row) => ({
    ...toShelf(row),
    _count: { items: row.item_count },
  }));
}

export function getShelf(db: SQLiteDatabase, shelfId: string): Shelf | null {
  const row = db.getFirstSync<LocalShelfRow>(
    `SELECT * FROM shelves WHERE id = ? AND deleted_at IS NULL`,
    [shelfId],
  );
  return row ? toShelf(row) : null;
}
