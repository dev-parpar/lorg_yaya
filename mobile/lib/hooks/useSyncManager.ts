import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { locationsApi } from "@/lib/api/locations";
import { useAuthStore } from "@/lib/store/auth-store";
import { useLocalDbStore } from "@/lib/store/local-db-store";
import { getDatabase } from "@/lib/local-db/database";
import { initSeqCounter } from "@/lib/local-db/operations";
import { SyncEngine } from "@/lib/sync/sync-engine";
import { migrateAllLocations } from "@/lib/sync/migration";
import { claimPendingKeyShares } from "@/lib/sync/key-manager";

/**
 * Manages the full sync lifecycle:
 *   1. Initializes SQLite + seq counter on mount
 *   2. Runs migration for each location (first-launch after local-first update)
 *   3. Claims pending key shares (multi-device key exchange)
 *   4. Creates a SyncEngine per location, runs initial pull, starts background timer
 *   5. Pulls on foreground, pushes on background
 *   6. Tears down on unmount / sign-out
 *
 * Called once from the (tabs) layout, so it only runs when authenticated.
 */
export function useSyncManager() {
  const { user } = useAuthStore();
  const enginesRef = useRef<Map<string, SyncEngine>>(new Map());
  const initializedRef = useRef(false);

  // Fetch locations from PostgreSQL (location metadata stays server-side)
  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: locationsApi.list,
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || !locations || initializedRef.current) return;
    initializedRef.current = true;

    async function initialize() {
      // 1. Initialize SQLite
      getDatabase();
      initSeqCounter();

      // 2. Claim any pending key shares (for shared locations)
      try {
        await claimPendingKeyShares();
      } catch {
        // Non-fatal — keys will be claimed on next sync cycle
      }

      // 3. Migrate locations from PostgreSQL → local SQLite (first-launch only)
      const locationIds = locations!.map((l) => ({ id: l.id }));
      try {
        await migrateAllLocations(locationIds, user!.id);
      } catch {
        // Non-fatal — migration will retry on next launch
      }

      // 4. Create SyncEngine per location, do initial pull, start timer
      for (const loc of locations!) {
        if (enginesRef.current.has(loc.id)) continue;
        const engine = new SyncEngine(loc.id);
        enginesRef.current.set(loc.id, engine);
        // Initial pull (don't await — run in background)
        engine.pull().catch(() => {});
        engine.startTimer();
      }

      // 5. Wire up schedulePush so writeOp can trigger debounced pushes
      useLocalDbStore.getState().setSchedulePush((locationId: string) => {
        const engine = enginesRef.current.get(locationId);
        if (engine) engine.schedulePush();
      });
    }

    void initialize();

    // 6. App state listener: pull on foreground, push pending on background
    function handleAppState(nextState: AppStateStatus) {
      if (nextState === "active") {
        for (const engine of enginesRef.current.values()) {
          engine.pull().catch(() => {});
        }
      } else if (nextState === "background") {
        for (const engine of enginesRef.current.values()) {
          engine.push().catch(() => {});
        }
      }
    }

    const subscription = AppState.addEventListener("change", handleAppState);

    return () => {
      subscription.remove();
      // Stop all engines on unmount (sign-out)
      for (const engine of enginesRef.current.values()) {
        engine.stopTimer();
      }
      enginesRef.current.clear();
      initializedRef.current = false;
      useLocalDbStore.getState().setSchedulePush(null);
    };
  }, [user, locations]);

  /**
   * Returns the SyncEngine for a specific location, so screens can
   * trigger immediate sync (e.g. after a write).
   */
  function getEngine(locationId: string): SyncEngine | undefined {
    return enginesRef.current.get(locationId);
  }

  return { getEngine };
}
