import { getDatabase } from "@/lib/local-db/database";
import { getFlatInventory } from "@/lib/local-db/queries/inventory";
import { getLocationStructure } from "@/lib/local-db/queries/structure";
import { useSQLiteQuery } from "./useSQLiteQuery";
import type { FlatInventoryItem, LocationStructure } from "@/types";

/**
 * Returns the flat inventory list for the AI chat assistant.
 * Reads entirely from local SQLite — no network request.
 *
 * @param locations Location metadata (id, name, type) from the API.
 *   Location metadata still lives in PostgreSQL, so it must be provided
 *   externally (e.g., from a React Query cache of GET /api/locations).
 */
export function useLocalInventory(
  locations: Array<{ id: string; name: string; type: string }>,
) {
  const db = getDatabase();

  // Use location IDs as a stable cache key (locations array is a new reference each render)
  const locationIds = locations.map((l) => l.id).join(",");

  const { data: inventory } = useSQLiteQuery<FlatInventoryItem[]>(
    ["items", "cabinets", "shelves"],
    () => getFlatInventory(db, locations),
    [locationIds],
  );

  const { data: structure } = useSQLiteQuery<LocationStructure[]>(
    ["cabinets", "shelves"],
    () => getLocationStructure(db, locations),
    [locationIds],
  );

  return { inventory, structure, isLoading: false as const };
}
