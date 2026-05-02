import type { SQLiteDatabase } from "expo-sqlite";
import type { FlatInventoryItem } from "@/types";

/**
 * Builds the flat inventory list used by the AI chat assistant.
 * Replaces GET /api/inventory/full — now reads entirely from local SQLite.
 *
 * Location name and type must be provided externally since location
 * metadata still lives in PostgreSQL.
 */
export function getFlatInventory(
  db: SQLiteDatabase,
  locations: Array<{ id: string; name: string; type: string }>,
): FlatInventoryItem[] {
  const locationMap = new Map(locations.map((l) => [l.id, l]));

  const rows = db.getAllSync<{
    name: string;
    description: string | null;
    quantity: number;
    item_type: string;
    tags: string;
    cabinet_name: string;
    shelf_name: string | null;
    location_id: string;
  }>(
    `SELECT
       i.name,
       i.description,
       i.quantity,
       i.item_type,
       i.tags,
       c.name AS cabinet_name,
       s.name AS shelf_name,
       c.location_id
     FROM items i
     JOIN cabinets c ON i.cabinet_id = c.id AND c.deleted_at IS NULL
     LEFT JOIN shelves s ON i.shelf_id = s.id AND s.deleted_at IS NULL
     WHERE i.deleted_at IS NULL
     ORDER BY c.location_id, c.name, s.position`,
  );

  return rows.map((row) => {
    const loc = locationMap.get(row.location_id);
    return {
      location: loc?.name ?? "Unknown",
      locationType: loc?.type ?? "HOME",
      cabinet: row.cabinet_name,
      shelf: row.shelf_name,
      name: row.name,
      type: row.item_type,
      quantity: row.quantity,
      description: row.description,
      tags: JSON.parse(row.tags),
    };
  });
}
