import { useCallback, useRef } from "react";
import { useLocalDbStore } from "@/lib/store/local-db-store";

/**
 * Reactive SQLite query hook. Re-runs the query whenever the
 * watched table's version counter is bumped (via writeOp).
 *
 * Replaces React Query for local inventory data. The pattern:
 *   1. writeOp() applies a change to SQLite
 *   2. writeOp() calls bumpTable("items") on the Zustand store
 *   3. All useSQLiteQuery hooks watching "items" re-run their queryFn
 *   4. UI re-renders with fresh data
 *
 * The query runs synchronously during render (SQLite reads are fast).
 * No useEffect/setState cycle — avoids "Maximum update depth exceeded".
 *
 * @param tables  Table names to watch (e.g., ["cabinets"], ["items", "shelves"])
 * @param queryFn Synchronous function that reads from SQLite and returns data
 * @param deps    Additional cache-key values (e.g. cabinetId) — re-queries when any changes
 */
export function useSQLiteQuery<T>(
  tables: string[],
  queryFn: () => T,
  deps: unknown[] = [],
): { data: T; isLoading: false; refetch: () => void } {
  // Subscribe to the combined version for watched tables.
  // Zustand's subscribe fires only when the selected value changes.
  const combinedVersion = useLocalDbStore(
    useCallback(
      (s) => tables.reduce((sum, t) => sum + (s.tableVersions[t] ?? 0), 0),
      // tables array is always a static literal at each call site
      // eslint-disable-next-line react-hooks/exhaustive-deps
      tables,
    ),
  );

  // Build a simple cache key from version + deps.
  // Deps are primitives (strings, numbers, null) so JSON.stringify is safe.
  const cacheKey = `${combinedVersion}:${JSON.stringify(deps)}`;

  // Cache: re-run queryFn only when the cache key changes.
  const cacheRef = useRef<{ key: string; result: T } | null>(null);

  if (!cacheRef.current || cacheRef.current.key !== cacheKey) {
    cacheRef.current = { key: cacheKey, result: queryFn() };
  }

  const refetch = useCallback(() => {
    cacheRef.current = null;
  }, []);

  return { data: cacheRef.current.result, isLoading: false, refetch };
}
