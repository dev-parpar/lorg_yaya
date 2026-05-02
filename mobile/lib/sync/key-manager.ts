import * as ExpoCrypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { keySharesApi } from "@/lib/api/key-shares";
import { getLocationKey } from "./crypto";

const KEY_PREFIX = "location_key_";

// ── Base64 helpers ────────────────────────────────────────────────────────────
// These mirror the helpers in crypto.ts. The module is intentionally
// self-contained so it can be used independently of the full crypto module.

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── Owner side ────────────────────────────────────────────────────────────────

/**
 * Share the location key with a recipient.
 * For v1, we use a simple approach: the location key is "encrypted" with
 * a wrapping key derived from the invite context. For simplicity in v1,
 * the key is sent as base64 with a random nonce — the server mediates
 * the exchange and the transport is HTTPS-encrypted.
 *
 * A future version will use X25519 key agreement.
 */
export async function shareLocationKey(
  locationId: string,
  recipientId: string,
): Promise<void> {
  const key = await getLocationKey(locationId);
  if (!key) throw new Error(`No location key found for ${locationId}`);

  // v1: Encode key as base64 for transport. The nonce is a random
  // value used as a placeholder for the future wrapping scheme.
  const nonce = ExpoCrypto.getRandomBytes(16);

  await keySharesApi.share(locationId, {
    recipientId,
    encryptedKey: uint8ToBase64(key),
    nonce: uint8ToBase64(nonce),
  });
}

// ── Recipient side ────────────────────────────────────────────────────────────

/**
 * Check for pending key shares and claim them.
 * Stores each location key in SecureStore.
 * Returns the list of locationIds that were newly claimed.
 */
export async function claimPendingKeyShares(): Promise<string[]> {
  const pending = await keySharesApi.getPending();
  const claimedLocationIds: string[] = [];

  for (const share of pending) {
    try {
      // v1: The encryptedKey is just base64-encoded raw key
      const keyBytes = base64ToUint8(share.encryptedKey);

      // Store in SecureStore using the same prefix as crypto.ts so
      // getLocationKey() / getOrCreateLocationKey() pick it up transparently.
      await SecureStore.setItemAsync(
        `${KEY_PREFIX}${share.locationId}`,
        uint8ToBase64(keyBytes),
      );

      // Mark as claimed on the server
      await keySharesApi.claim(share.id);
      claimedLocationIds.push(share.locationId);
    } catch (err) {
      console.warn(`[key-manager] Failed to claim key share ${share.id}`, err);
    }
  }

  return claimedLocationIds;
}

/**
 * Check if we have a location key stored locally.
 */
export async function hasLocationKey(locationId: string): Promise<boolean> {
  const key = await getLocationKey(locationId);
  return key !== null;
}
