import { create } from "zustand";

interface LocalDbState {
  /** Version counter per table — bumped on local writes to trigger re-renders */
  tableVersions: Record<string, number>;
  bumpTable: (table: string) => void;

  /** Pending op counts per location — shown in UI sync indicators */
  pendingCounts: Record<string, number>;
  setPendingCount: (locationId: string, count: number) => void;

  /** Sync status per location */
  syncErrors: Record<string, string>;
  setSyncError: (locationId: string, error: string | null) => void;
  lastSynced: Record<string, string>;
  setLastSynced: (locationId: string, timestamp: string) => void;
}

export const useLocalDbStore = create<LocalDbState>((set) => ({
  tableVersions: {},
  bumpTable: (table) =>
    set((state) => ({
      tableVersions: {
        ...state.tableVersions,
        [table]: (state.tableVersions[table] ?? 0) + 1,
      },
    })),

  pendingCounts: {},
  setPendingCount: (locationId, count) =>
    set((state) => ({
      pendingCounts: { ...state.pendingCounts, [locationId]: count },
    })),

  syncErrors: {},
  setSyncError: (locationId, error) =>
    set((state) => {
      const next = { ...state.syncErrors };
      if (error) {
        next[locationId] = error;
      } else {
        delete next[locationId];
      }
      return { syncErrors: next };
    }),

  lastSynced: {},
  setLastSynced: (locationId, timestamp) =>
    set((state) => ({
      lastSynced: { ...state.lastSynced, [locationId]: timestamp },
    })),
}));
