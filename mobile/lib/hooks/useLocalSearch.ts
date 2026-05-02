import { getDatabase } from "@/lib/local-db/database";
import { searchItems } from "@/lib/local-db/queries/items";
import { useSQLiteQuery } from "./useSQLiteQuery";
import type { Item } from "@/types";

export type SearchResult = Item & { cabinetName: string; locationId: string };

export function useLocalSearch(query: string) {
  const db = getDatabase();

  const { data: results, isLoading } = useSQLiteQuery<SearchResult[]>(
    ["items"],
    () => (query.length >= 2 ? searchItems(db, query) : []),
    [query],
  );

  return { results: results ?? [], isLoading };
}
