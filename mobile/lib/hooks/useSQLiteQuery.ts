import { useState, useEffect, useCallback } from "react";
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
 * @param tables  Table names to watch (e.g., ["cabinets"], ["items", "shelves"])
 * @param queryFn Synchronous function that reads from SQLite and returns data
 * @param deps    Additional dependencies that should trigger a re-query
 */
export function useSQLiteQuery<T>(
  tables: string[],
  queryFn: () => T,
  deps: unknown[] = [],
): { data: T | undefined; isLoading: boolean; refetch: () => void } {
  const tableVersions = useLocalDbStore((s) => s.tableVersions);

  // Compute a combined version for all watched tables
  const combinedVersion = tables.reduce(
    (sum, t) => sum + (tableVersions[t] ?? 0),
    0,
  );

  const [data, setData] = useState<T>();
  const [isLoading, setIsLoading] = useState(true);

  const runQuery = useCallback(() => {
    setIsLoading(true);
    try {
      const result = queryFn();
      setData(result);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinedVersion, ...deps]);

  useEffect(() => {
    runQuery();
  }, [runQuery]);

  return { data, isLoading, refetch: runQuery };
}
