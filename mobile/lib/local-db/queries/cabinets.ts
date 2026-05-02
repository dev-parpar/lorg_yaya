import type { SQLiteDatabase } from "expo-sqlite";
import type { Cabinet, CabinetWithCounts } from "@/types";
import type { LocalCabinetRow } from "../types";

function toCabinet(row: LocalCabinetRow): Cabinet {
  return {
    id: row.id,
    locationId: row.location_id,
    name: row.name,
    description: row.description,
    imagePath: row.image_path,
    signedImageUrl: row.signed_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function getCabinets(db: SQLiteDatabase, locationId: string): CabinetWithCounts[] {
  const rows = db.getAllSync<
    LocalCabinetRow & { shelf_count: number; item_count: number }
  >(
    `SELECT c.*,
       (SELECT COUNT(*) FROM shelves s WHERE s.cabinet_id = c.id AND s.deleted_at IS NULL) AS shelf_count,
       (SELECT COUNT(*) FROM items i WHERE i.cabinet_id = c.id AND i.deleted_at IS NULL) AS item_count
     FROM cabinets c
     WHERE c.location_id = ? AND c.deleted_at IS NULL
     ORDER BY c.created_at DESC`,
    [locationId],
  );

  return rows.map((row) => ({
    ...toCabinet(row),
    _count: { shelves: row.shelf_count, items: row.item_count },
  }));
}

export function getCabinet(db: SQLiteDatabase, cabinetId: string): Cabinet | null {
  const row = db.getFirstSync<LocalCabinetRow>(
    `SELECT * FROM cabinets WHERE id = ? AND deleted_at IS NULL`,
    [cabinetId],
  );
  return row ? toCabinet(row) : null;
}
