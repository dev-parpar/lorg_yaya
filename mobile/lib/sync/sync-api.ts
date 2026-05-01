import { apiClient } from "@/lib/api/client";
import type { SyncManifest } from "@/lib/local-db/types";

/**
 * Fetch the sync manifest for a location.
 * Returns null if the location has no remote oplog yet.
 */
export async function fetchManifest(
  locationId: string,
): Promise<SyncManifest | null> {
  return apiClient.get<SyncManifest | null>(
    `/api/sync/${locationId}/manifest`,
  );
}

/**
 * Request a signed download URL for the remote oplog.
 * Returns null if there is no oplog to pull.
 */
export async function pullOplog(
  locationId: string,
): Promise<{ url: string; manifest: SyncManifest } | null> {
  return apiClient.post<{ url: string; manifest: SyncManifest } | null>(
    `/api/sync/${locationId}/pull`,
    {},
  );
}

/**
 * Push the local oplog to remote with optimistic-locking via the manifest.
 * The server returns `accepted: false` on a hash conflict (409-style).
 */
export async function pushOplog(
  locationId: string,
  oplogBase64: string,
  manifest: SyncManifest,
): Promise<{ accepted: boolean; manifest: SyncManifest }> {
  return apiClient.post<{ accepted: boolean; manifest: SyncManifest }>(
    `/api/sync/${locationId}/push`,
    { oplog: oplogBase64, manifest },
  );
}
