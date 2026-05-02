import type { SQLiteDatabase } from "expo-sqlite";
import type { LocationStructure } from "@/types";

/**
 * Queries all cabinets and shelves across the given locations,
 * including empty ones. Used to give the AI full visibility into
 * the location structure for cabinet/shelf management.
 */
export function getLocationStructure(
  db: SQLiteDatabase,
  locations: Array<{ id: string; name: string; type: string }>,
): LocationStructure[] {
  const locationMap = new Map(locations.map((l) => [l.id, l]));
  const locationIds = locations.map((l) => l.id);
  if (locationIds.length === 0) return [];

  const placeholders = locationIds.map(() => "?").join(", ");

  // Fetch all cabinets
  const cabinetRows = db.getAllSync<{
    id: string;
    location_id: string;
    name: string;
    description: string | null;
  }>(
    `SELECT id, location_id, name, description
     FROM cabinets
     WHERE location_id IN (${placeholders}) AND deleted_at IS NULL
     ORDER BY name`,
    locationIds,
  );

  // Fetch all shelves for these cabinets
  const cabinetIds = cabinetRows.map((c) => c.id);
  let shelfRows: Array<{
    id: string;
    cabinet_id: string;
    name: string;
    position: number;
  }> = [];

  if (cabinetIds.length > 0) {
    const shelfPlaceholders = cabinetIds.map(() => "?").join(", ");
    shelfRows = db.getAllSync<{
      id: string;
      cabinet_id: string;
      name: string;
      position: number;
    }>(
      `SELECT id, cabinet_id, name, position
       FROM shelves
       WHERE cabinet_id IN (${shelfPlaceholders}) AND deleted_at IS NULL
       ORDER BY position`,
      cabinetIds,
    );
  }

  // Group shelves by cabinet
  const shelvesByCabinet = new Map<string, typeof shelfRows>();
  for (const shelf of shelfRows) {
    if (!shelvesByCabinet.has(shelf.cabinet_id)) {
      shelvesByCabinet.set(shelf.cabinet_id, []);
    }
    shelvesByCabinet.get(shelf.cabinet_id)!.push(shelf);
  }

  // Group cabinets by location
  const cabinetsByLocation = new Map<string, typeof cabinetRows>();
  for (const cab of cabinetRows) {
    if (!cabinetsByLocation.has(cab.location_id)) {
      cabinetsByLocation.set(cab.location_id, []);
    }
    cabinetsByLocation.get(cab.location_id)!.push(cab);
  }

  // Build the structure
  return locationIds.map((locId) => {
    const loc = locationMap.get(locId)!;
    const cabs = cabinetsByLocation.get(locId) ?? [];

    return {
      locationId: locId,
      locationName: loc.name,
      locationType: loc.type,
      cabinets: cabs.map((cab) => ({
        cabinetId: cab.id,
        cabinetName: cab.name,
        description: cab.description,
        shelves: (shelvesByCabinet.get(cab.id) ?? []).map((s) => ({
          shelfId: s.id,
          shelfName: s.name,
          position: s.position,
        })),
      })),
    };
  });
}
