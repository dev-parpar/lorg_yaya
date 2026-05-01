import { supabaseAdmin } from "@/lib/auth/supabase-admin";

/**
 * TTL for signed URLs: 10 years in seconds.
 *
 * Signed URLs are generated once at upload time and stored in the database
 * alongside the storage path. Using a very long TTL keeps the URL stable
 * across API calls so expo-image's disk cache remains valid indefinitely.
 *
 * Revoking access is handled by deleting the file from storage (e.g. on
 * account deletion), which invalidates any signed URL for that path regardless
 * of the TTL.
 */
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

export type StorageBucket =
  | "avatars"
  | "locations"
  | "cabinets"
  | "shelves"
  | "items"
  | "sync";

/**
 * Generate a stable, long-lived signed URL for a private storage path.
 * Returns null if the path is null or if signing fails.
 */
export async function generateSignedUrl(
  bucket: StorageBucket,
  path: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL);

  if (error || !data?.signedUrl) {
    console.error(`[storage/sign] Failed to sign ${bucket}/${path}:`, error?.message);
    return null;
  }

  return data.signedUrl;
}

/**
 * Delete a file from storage. Called when a user removes a photo or
 * deletes their account.
 */
export async function deleteStorageFile(
  bucket: StorageBucket,
  path: string,
): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) {
    console.error(`[storage/sign] Failed to delete ${bucket}/${path}:`, error.message);
  }
}
