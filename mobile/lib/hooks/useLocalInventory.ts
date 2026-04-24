import { getDatabase } from "@/lib/local-db/database";
import { getFlatInventory } from "@/lib/local-db/queries/inventory";
import { useSQLiteQuery } from "./useSQLiteQuery";
import type { FlatInventoryItem } from "@/types";

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

  const { data: inventory, isLoading } = useSQLiteQuery<FlatInventoryItem[]>(
    ["items", "cabinets", "shelves"],
    () => getFlatInventory(db, locations),
    [locations],
  );

  return { inventory: inventory ?? [], isLoading };
}
