import { supabaseAdmin } from "@/lib/auth/supabase-admin";
import { logger } from "@/lib/logger";

const SYNC_BUCKET = "sync";
const DOWNLOAD_URL_TTL = 300; // 5 minutes

export interface SyncManifest {
  locationId: string;
  opCount: number;
  contentHash: string;
  lastModified: string;
  deviceSeqs: Record<string, number>;
  schemaVersion: number;
  compactedAt: string | null;
}

function manifestPath(locationId: string) {
  return `${locationId}/manifest.json`;
}

function oplogPath(locationId: string) {
  return `${locationId}/oplog.enc`;
}

/**
 * Download the sync manifest for a location.
 * Returns null if no manifest has been uploaded yet.
 */
export async function downloadManifest(locationId: string): Promise<SyncManifest | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(SYNC_BUCKET)
    .download(manifestPath(locationId));

  if (error) {
    // Supabase returns an error when the object does not exist
    logger.warn("[sync-storage] manifest not found", { locationId, error: error.message });
    return null;
  }

  const text = await data.text();
  return JSON.parse(text) as SyncManifest;
}

/**
 * Upload (upsert) the sync manifest for a location.
 */
export async function uploadManifest(locationId: string, manifest: SyncManifest): Promise<void> {
  const json = JSON.stringify(manifest);
  const { error } = await supabaseAdmin.storage
    .from(SYNC_BUCKET)
    .upload(manifestPath(locationId), json, {
      upsert: true,
      contentType: "application/json",
    });

  if (error) {
    logger.error("[sync-storage] failed to upload manifest", { locationId, error: error.message });
    throw error;
  }
}

/**
 * Download the encrypted oplog for a location.
 * Returns null if no oplog has been uploaded yet.
 */
export async function downloadOplog(locationId: string): Promise<Uint8Array | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(SYNC_BUCKET)
    .download(oplogPath(locationId));

  if (error) {
    logger.warn("[sync-storage] oplog not found", { locationId, error: error.message });
    return null;
  }

  const buffer = await data.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Upload (upsert) the encrypted oplog for a location.
 */
export async function uploadOplog(locationId: string, data: Buffer): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(SYNC_BUCKET)
    .upload(oplogPath(locationId), data, {
      upsert: true,
      contentType: "application/octet-stream",
    });

  if (error) {
    logger.error("[sync-storage] failed to upload oplog", { locationId, error: error.message });
    throw error;
  }
}

/**
 * Generate a short-lived (5-minute) signed URL for the encrypted oplog.
 * Returns null if signing fails.
 */
export async function generateSyncDownloadUrl(locationId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(SYNC_BUCKET)
    .createSignedUrl(oplogPath(locationId), DOWNLOAD_URL_TTL);

  if (error || !data?.signedUrl) {
    logger.error("[sync-storage] failed to generate signed URL", {
      locationId,
      error: error?.message,
    });
    return null;
  }

  return data.signedUrl;
}
