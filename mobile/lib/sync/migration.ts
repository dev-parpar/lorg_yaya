import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { getDatabase } from "@/lib/local-db/database";
import { applyOps } from "@/lib/local-db/materializer";
import { syncApi } from "@/lib/api/sync";
import { getOrCreateLocationKey, encrypt } from "./crypto";
import { serializeOps } from "./ndjson";
import { fetchManifest, pushOplog } from "./sync-api";
import type { Operation, SyncManifest } from "@/lib/local-db/types";

const MIGRATED_KEY_PREFIX = "migrated_location_";

// ── Migration state ───────────────────────────────────────────────────────────

/**
 * Check if a location has already been migrated.
 */
export async function isLocationMigrated(locationId: string): Promise<boolean> {
  const value = await SecureStore.getItemAsync(
    `${MIGRATED_KEY_PREFIX}${locationId}`,
  );
  return value === "true";
}

/**
 * Mark a location as migrated.
 */
async function markMigrated(locationId: string): Promise<void> {
  await SecureStore.setItemAsync(
    `${MIGRATED_KEY_PREFIX}${locationId}`,
    "true",
  );
}

// ── Single-location migration ─────────────────────────────────────────────────

/**
 * Migrate a single location from PostgreSQL to local-first.
 *
 * Flow:
 * 1. Call the export endpoint to get all data as ops
 * 2. Convert to Operation format (add id, locationId fields)
 * 3. Apply ops to local SQLite
 * 4. Encrypt and push to Supabase Storage (first-migrator-wins)
 * 5. Mark as migrated
 *
 * If the location already has a remote oplog (another device migrated first),
 * skip the push — just apply locally and mark migrated.
 */
export async function migrateLocation(
  locationId: string,
  userId: string,
): Promise<void> {
  // Short-circuit if already done
  if (await isLocationMigrated(locationId)) return;

  // 1. Export from PostgreSQL
  const { ops: rawOps } = await syncApi.exportLocation(locationId);
  if (rawOps.length === 0) {
    // Empty location — nothing to migrate locally, just mark done.
    await markMigrated(locationId);
    return;
  }

  // 2. Convert to full Operation format.
  // The export endpoint omits `id` and `locationId` from each op envelope —
  // we add them client-side here.
  const operations: Operation[] = rawOps.map((raw) => ({
    id: Crypto.randomUUID(),
    seq: raw.seq,
    timestamp: raw.timestamp,
    userId: raw.userId,
    deviceId: raw.deviceId,
    locationId,
    type: raw.type as Operation["type"],
    payload: raw.payload as unknown as Operation["payload"],
  }));

  // 3. Apply to local SQLite
  const db = getDatabase();
  applyOps(db, operations);

  // 4. Check if remote oplog already exists (first-migrator-wins).
  // If another device has already pushed a manifest we skip the upload
  // to avoid overwriting a potentially more up-to-date oplog.
  const existingManifest = await fetchManifest(locationId);

  if (!existingManifest) {
    // We are the first device to migrate — push the bootstrapped oplog.
    const key = await getOrCreateLocationKey(locationId);
    const ndjson = serializeOps(operations);
    const plaintext = new TextEncoder().encode(ndjson);
    const encrypted = await encrypt(key, plaintext);

    // Base64-encode encrypted bytes for API transport
    let binary = "";
    for (const byte of encrypted) binary += String.fromCharCode(byte);
    const oplogBase64 = btoa(binary);

    // SHA-256 of the plaintext NDJSON for integrity verification
    const hashBuffer = await crypto.subtle.digest("SHA-256", plaintext);
    const contentHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Build device sequence index from the exported ops
    const deviceSeqs: Record<string, number> = {};
    for (const op of operations) {
      const prev = deviceSeqs[op.deviceId] ?? 0;
      if (op.seq > prev) deviceSeqs[op.deviceId] = op.seq;
    }

    const manifest: SyncManifest = {
      locationId,
      opCount: operations.length,
      contentHash,
      lastModified: new Date().toISOString(),
      deviceSeqs,
      schemaVersion: 1,
      compactedAt: null,
    };

    await pushOplog(locationId, oplogBase64, manifest);

    // Persist sync state so the engine knows it's up-to-date
    db.runSync(
      `INSERT OR REPLACE INTO sync_meta (location_id, remote_hash, device_seqs, last_synced_at)
       VALUES (?, ?, ?, ?)`,
      [
        locationId,
        contentHash,
        JSON.stringify(deviceSeqs),
        new Date().toISOString(),
      ],
    );
  }

  // 5. Mark as migrated in SecureStore
  await markMigrated(locationId);
}

// ── Bulk migration ────────────────────────────────────────────────────────────

/**
 * Migrate all locations for the current user.
 * Called on first app launch after the local-first update.
 *
 * @param locations - Array of location objects from the API (at minimum `{ id }`)
 * @param userId    - The authenticated user's ID
 * @returns Summary of which locations were migrated, skipped, or failed
 */
export async function migrateAllLocations(
  locations: Array<{ id: string }>,
  userId: string,
): Promise<{ migrated: string[]; skipped: string[]; failed: string[] }> {
  const migrated: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const location of locations) {
    try {
      if (await isLocationMigrated(location.id)) {
        skipped.push(location.id);
        continue;
      }
      await migrateLocation(location.id, userId);
      migrated.push(location.id);
    } catch (err) {
      console.warn(
        `[migration] Failed to migrate location ${location.id}`,
        err,
      );
      failed.push(location.id);
    }
  }

  return { migrated, skipped, failed };
}
