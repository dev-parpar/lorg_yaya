import { AppState, type AppStateStatus } from "react-native";
import type { SyncEngine } from "./sync-engine";

let subscription: ReturnType<typeof AppState.addEventListener> | null = null;

/**
 * Register a global AppState listener that reacts to foreground/background
 * transitions for all active SyncEngine instances.
 *
 * - Foreground (active): pull latest changes from remote.
 * - Background / inactive: flush any pending local ops.
 *
 * Safe to call multiple times — will only register one listener.
 */
export function startAppStateListener(engines: Map<string, SyncEngine>): void {
  if (subscription) return;

  subscription = AppState.addEventListener(
    "change",
    (state: AppStateStatus) => {
      if (state === "active") {
        // App came to foreground — pull latest remote state.
        for (const engine of engines.values()) {
          engine.pull().catch(() => {});
        }
      } else if (state === "background" || state === "inactive") {
        // App going to background — flush any queued ops.
        for (const engine of engines.values()) {
          engine.push().catch(() => {});
        }
      }
    },
  );
}

/**
 * Remove the AppState listener registered by startAppStateListener.
 * Should be called when all SyncEngines are torn down (e.g., sign-out).
 */
export function stopAppStateListener(): void {
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
}
