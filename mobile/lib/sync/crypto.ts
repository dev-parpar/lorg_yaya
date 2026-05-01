import * as SecureStore from "expo-secure-store";

const KEY_PREFIX = "location_key_";
const IV_LENGTH = 12;

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
  const cryptoKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  const rawBuffer = await crypto.subtle.exportKey("raw", cryptoKey);
  const keyBytes = new Uint8Array(rawBuffer);

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

// ── Encrypt / Decrypt ─────────────────────────────────────────────────────────

/**
 * Copy a Uint8Array into a new ArrayBuffer-backed Uint8Array.
 * This satisfies the TypeScript `BufferSource` constraint which requires
 * `ArrayBufferView<ArrayBuffer>` (not `ArrayBufferView<ArrayBufferLike>`).
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(bytes.length);
  new Uint8Array(buf).set(bytes);
  return buf;
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Output layout: [12-byte IV][ciphertext+tag]
 */
export async function encrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(key),
    "AES-GCM",
    false,
    ["encrypt"],
  );

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    toArrayBuffer(plaintext),
  );

  const ciphertext = new Uint8Array(ciphertextBuffer);
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

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(key),
    "AES-GCM",
    false,
    ["decrypt"],
  );

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    toArrayBuffer(ciphertext),
  );

  return new Uint8Array(plaintextBuffer);
}
