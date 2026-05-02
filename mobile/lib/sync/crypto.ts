import * as ExpoCrypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { gcm } from "@noble/ciphers/aes";

const KEY_PREFIX = "location_key_";
const IV_LENGTH = 12;
const KEY_LENGTH = 32; // AES-256

// ── Base64 helpers (Hermes-safe, no Node Buffer) ──────────────────────────────

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

// ── Key management ────────────────────────────────────────────────────────────

/**
 * Generate a new AES-256-GCM key for a location and persist it in SecureStore.
 * Returns the raw key as a Uint8Array.
 */
export async function generateLocationKey(
  locationId: string,
): Promise<Uint8Array> {
  const keyBytes = ExpoCrypto.getRandomBytes(KEY_LENGTH);

  await SecureStore.setItemAsync(
    `${KEY_PREFIX}${locationId}`,
    uint8ToBase64(keyBytes),
  );

  return keyBytes;
}

/**
 * Retrieve the location key from SecureStore.
 * Returns null if no key has been generated yet.
 */
export async function getLocationKey(
  locationId: string,
): Promise<Uint8Array | null> {
  const stored = await SecureStore.getItemAsync(
    `${KEY_PREFIX}${locationId}`,
  );
  if (!stored) return null;
  return base64ToUint8(stored);
}

/**
 * Return the existing location key or generate a new one.
 * Used by the sync engine on every push/pull cycle.
 */
export async function getOrCreateLocationKey(
  locationId: string,
): Promise<Uint8Array> {
  const existing = await getLocationKey(locationId);
  if (existing) return existing;
  return generateLocationKey(locationId);
}

// ── SHA-256 helper ───────────────────────────────────────────────────────────

/**
 * Compute SHA-256 hex digest of a Uint8Array.
 * Uses expo-crypto instead of Web Crypto API (not available in React Native).
 */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  // Copy into a fresh ArrayBuffer to satisfy the BufferSource constraint
  // (Uint8Array<ArrayBufferLike> isn't assignable to ArrayBufferView<ArrayBuffer>)
  const buf = new ArrayBuffer(data.length);
  new Uint8Array(buf).set(data);
  const hashBuffer = await ExpoCrypto.digest(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    new Uint8Array(buf),
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Encrypt / Decrypt ─────────────────────────────────────────────────────────

/**
 * Encrypt plaintext with AES-256-GCM using @noble/ciphers.
 * Output layout: [12-byte IV][ciphertext+tag]
 */
export async function encrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const iv = ExpoCrypto.getRandomBytes(IV_LENGTH);
  const aes = gcm(key, iv);
  const ciphertext = aes.encrypt(plaintext);

  const result = new Uint8Array(IV_LENGTH + ciphertext.length);
  result.set(iv, 0);
  result.set(ciphertext, IV_LENGTH);
  return result;
}

/**
 * Decrypt data produced by encrypt().
 * Input layout: [12-byte IV][ciphertext+tag]
 */
export async function decrypt(
  key: Uint8Array,
  data: Uint8Array,
): Promise<Uint8Array> {
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);
  const aes = gcm(key, iv);
  return aes.decrypt(ciphertext);
}
