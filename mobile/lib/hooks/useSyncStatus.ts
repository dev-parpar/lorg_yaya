import { useLocalDbStore } from "@/lib/store/local-db-store";

/**
 * Exposes sync status for a specific location.
 * Used by the UI to show sync indicators (green/orange/red dot).
 */
export function useSyncStatus(locationId: string) {
  const pendingCount = useLocalDbStore(
    (s) => s.pendingCounts[locationId] ?? 0,
  );
  const syncError = useLocalDbStore(
    (s) => s.syncErrors[locationId] ?? null,
  );
  const lastSynced = useLocalDbStore(
    (s) => s.lastSynced[locationId] ?? null,
  );

  return {
    pendingCount,
    syncError,
    lastSynced,
    isSynced: pendingCount === 0 && !syncError,
    hasError: !!syncError,
  };
}
