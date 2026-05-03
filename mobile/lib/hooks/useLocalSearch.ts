import { useRef } from "react";
import { getDatabase } from "@/lib/local-db/database";
import { searchItems } from "@/lib/local-db/queries/items";
import { useSQLiteQuery } from "./useSQLiteQuery";
import { posthog } from "@/lib/analytics/posthog";
import type { Item } from "@/types";

export type SearchResult = Item & { cabinetName: string; locationId: string };

export function useLocalSearch(query: string) {
  const db = getDatabase();
  const lastCaptured = useRef("");

  const { data: results, isLoading } = useSQLiteQuery<SearchResult[]>(
    ["items"],
    () => {
      if (query.length < 2) return [];
      const items = searchItems(db, query);
      // Capture once per distinct query to avoid flooding events on each keystroke
      if (query !== lastCaptured.current) {
        lastCaptured.current = query;
        posthog?.capture("search_performed", {
          queryLength: query.length,
          resultCount: items.length,
        });
      }
      return items;
    },
    [query],
  );

  return { results: results ?? [], isLoading };
}
