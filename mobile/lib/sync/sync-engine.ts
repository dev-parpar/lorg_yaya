import { getDatabase } from "@/lib/local-db/database";
import { getPendingOps, clearPendingOps } from "@/lib/local-db/operations";
import { applyOps } from "@/lib/local-db/materializer";
import { useLocalDbStore } from "@/lib/store/local-db-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { ApiRequestError } from "@/lib/api/client";
import { fetchManifest, pullOplog, pushOplog } from "./sync-api";
import { encrypt, decrypt, getOrCreateLocationKey, sha256Hex } from "./crypto";
import { serializeOps, parseOps, sortOps } from "./ndjson";
import { shouldCompact, compactFromState } from "./compaction";
import type { SyncManifest, Operation } from "@/lib/local-db/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Read the persisted device_seqs for a location from sync_meta. */
function readDeviceSeqs(locationId: string): Record<string, number> {
  const db = getDatabase();
  const row = db.getFirstSync<{ device_seqs: string | null }>(
    `SELECT device_seqs FROM sync_meta WHERE location_id = ?`,
    [locationId],
  );
  if (!row?.device_seqs) return {};
  try {
    return JSON.parse(row.device_seqs) as Record<string, number>;
  } catch (err) {
    console.warn("[sync-engine] Failed to parse device_seqs, resetting", err);
    return {};
  }
}

/** Read the persisted remote_hash for a location from sync_meta. */
function readRemoteHash(locationId: string): string | null {
  const db = getDatabase();
  const row = db.getFirstSync<{ remote_hash: string | null }>(
    `SELECT remote_hash FROM sync_meta WHERE location_id = ?`,
    [locationId],
  );
  return row?.remote_hash ?? null;
}

/**
 * Ensure sync_meta has a device_seqs column (added in Phase 2).
 * We add it lazily so old installs upgrade automatically.
 */
function ensureDeviceSeqsColumn(): void {
  const db = getDatabase();
  try {
    db.execSync(`ALTER TABLE sync_meta ADD COLUMN device_seqs TEXT`);
  } catch {
    // Column already exists — ignore.
  }
}

// ── SyncEngine ────────────────────────────────────────────────────────────────

export class SyncEngine {
  private locationId: string;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private pushMaxTimer: ReturnType<typeof setTimeout> | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isPushing = false;

  constructor(locationId: string) {
    this.locationId = locationId;
    ensureDeviceSeqsColumn();
  }

  // ── Pull ────────────────────────────────────────────────────────────────────

  /**
   * Pull remote changes and apply them to local SQLite.
   * Skips if the remote contentHash matches what we already have.
   */
  async pull(): Promise<void> {
    try {
      const manifest = await fetchManifest(this.locationId);
      if (!manifest) return;

      const localHash = readRemoteHash(this.locationId);
      if (localHash && localHash === manifest.contentHash) return;

      const pullResult = await pullOplog(this.locationId);
      if (!pullResult) return;

      const key = await getOrCreateLocationKey(this.locationId);

      const response = await fetch(pullResult.url);
      if (!response.ok) {
        throw new Error(`Failed to download oplog: ${response.status}`);
      }
      const encryptedBytes = new Uint8Array(await response.arrayBuffer());
      const decrypted = await decrypt(key, encryptedBytes);
      const ndjson = new TextDecoder().decode(decrypted);
      const remoteOps = parseOps(ndjson);

      // Filter to ops we haven't applied yet, skipping our own pending ops.
      const knownSeqs = readDeviceSeqs(this.locationId);
      const db = getDatabase();
      const pendingIds = new Set(
        db
          .getAllSync<{ id: string }>(
            `SELECT id FROM pending_ops WHERE location_id = ?`,
            [this.locationId],
          )
          .map((r) => r.id),
      );

      const newOps = remoteOps.filter((op) => {
        // Skip ops we've already seen from this device.
        const lastSeq = knownSeqs[op.deviceId] ?? 0;
        if (op.seq <= lastSeq) return false;
        // Skip our own pending ops (already applied locally).
        if (pendingIds.has(op.id)) return false;
        return true;
      });

      if (newOps.length > 0) {
        applyOps(db, newOps);
      }

      // Persist updated sync state.
      const now = new Date().toISOString();
      db.runSync(
        `INSERT OR REPLACE INTO sync_meta
         (location_id, remote_hash, device_seqs, last_synced_at)
         VALUES (?, ?, ?, ?)`,
        [
          this.locationId,
          pullResult.manifest.contentHash,
          JSON.stringify(pullResult.manifest.deviceSeqs),
          now,
        ],
      );

      // Bump all table versions so queries re-run.
      const { bumpTable, setLastSynced } = useLocalDbStore.getState();
      bumpTable("cabinets");
      bumpTable("shelves");
      bumpTable("items");
      setLastSynced(this.locationId, now);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      useLocalDbStore.getState().setSyncError(this.locationId, message);
    }
  }

  // ── Push ────────────────────────────────────────────────────────────────────

  /**
   * Push pending local ops to remote.
   * Always pulls first to ensure we merge against the latest remote state.
   * Retries up to 3 times on optimistic-lock conflicts.
   */
  async push(): Promise<void> {
    if (this.isPushing) return;
    this.isPushing = true;

    try {
      await this.pull();

      const pending = getPendingOps(this.locationId);
      if (pending.length === 0) return;

      const key = await getOrCreateLocationKey(this.locationId);

      // Download current remote oplog (if any) to merge against.
      let existingOps: Operation[] = [];
      let currentManifest: SyncManifest | null = null;

      const pullResult = await pullOplog(this.locationId);
      if (pullResult) {
        currentManifest = pullResult.manifest;
        const response = await fetch(pullResult.url);
        if (response.ok) {
          const encryptedBytes = new Uint8Array(await response.arrayBuffer());
          const decrypted = await decrypt(key, encryptedBytes);
          const ndjson = new TextDecoder().decode(decrypted);
          existingOps = parseOps(ndjson);
        }
      }

      // Merge: deduplicate by op id, then sort.
      const allOpsMap = new Map<string, Operation>();
      for (const op of existingOps) allOpsMap.set(op.id, op);
      for (const op of pending) allOpsMap.set(op.id, op);
      let mergedOps = sortOps(Array.from(allOpsMap.values()));

      // Compact if warranted.
      const opCountForCompaction =
        currentManifest != null
          ? existingOps.length + pending.length
          : mergedOps.length;
      const needsCompaction =
        currentManifest != null &&
        shouldCompact({ ...currentManifest, opCount: opCountForCompaction });

      if (needsCompaction) {
        const userId = useAuthStore.getState().user?.id ?? "";
        const db = getDatabase();
        mergedOps = compactFromState(db, this.locationId, userId);
      }

      // Serialize and encrypt.
      const ndjsonStr = serializeOps(mergedOps);
      const plaintext = new TextEncoder().encode(ndjsonStr);
      const encrypted = await encrypt(key, plaintext);

      // Base64-encode for API transport.
      let binary = "";
      for (const byte of encrypted) binary += String.fromCharCode(byte);
      const oplogBase64 = btoa(binary);

      // Compute SHA-256 of the plaintext NDJSON for integrity.
      const contentHash = await sha256Hex(plaintext);

      // Build the device sequence index from merged ops.
      const deviceSeqs: Record<string, number> = {};
      for (const op of mergedOps) {
        const prev = deviceSeqs[op.deviceId] ?? 0;
        if (op.seq > prev) deviceSeqs[op.deviceId] = op.seq;
      }

      const newManifest: SyncManifest = {
        locationId: this.locationId,
        opCount: mergedOps.length,
        contentHash,
        lastModified: new Date().toISOString(),
        deviceSeqs,
        schemaVersion: 1,
        compactedAt: needsCompaction
          ? new Date().toISOString()
          : currentManifest?.compactedAt ?? null,
      };

      // Push with retry on optimistic-lock conflict.
      let retries = 0;
      while (retries < 3) {
        try {
          const result = await pushOplog(
            this.locationId,
            oplogBase64,
            newManifest,
          );

          if (result.accepted) {
            clearPendingOps(pending.map((op) => op.id));

            const db = getDatabase();
            const now = new Date().toISOString();
            db.runSync(
              `INSERT OR REPLACE INTO sync_meta
               (location_id, remote_hash, device_seqs, last_synced_at)
               VALUES (?, ?, ?, ?)`,
              [
                this.locationId,
                contentHash,
                JSON.stringify(deviceSeqs),
                now,
              ],
            );

            const store = useLocalDbStore.getState();
            store.setLastSynced(this.locationId, now);
            store.setSyncError(this.locationId, null);
            store.setPendingCount(this.locationId, 0);
            break;
          }

          // Server returned accepted: false — treat as conflict.
          retries += 1;
          if (retries >= 3) {
            throw new Error("Push rejected after 3 attempts");
          }
          await this.pull();
        } catch (err: unknown) {
          const isConflict =
            err instanceof ApiRequestError && err.statusCode === 409;

          if (isConflict) {
            retries += 1;
            if (retries >= 3) throw err;
            await this.pull();
            continue;
          }
          throw err;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      useLocalDbStore.getState().setSyncError(this.locationId, message);
    } finally {
      this.isPushing = false;
    }
  }

  // ── Sync (bidirectional) ────────────────────────────────────────────────────

  /**
   * Pull then push. Skips push if there are no pending ops.
   */
  async sync(): Promise<void> {
    await this.pull();
    const pending = getPendingOps(this.locationId);
    if (pending.length > 0) {
      await this.push();
    }
  }

  // ── Scheduled push ──────────────────────────────────────────────────────────

  /**
   * Schedule a debounced push: 10-second debounce, hard 15-second maximum.
   * Calling this multiple times before the timer fires resets the debounce
   * but keeps the 15-second cap.
   */
  schedulePush(): void {
    if (this.pushTimer) clearTimeout(this.pushTimer);

    this.pushTimer = setTimeout(() => {
      this.push().catch(() => {});
      this.clearMaxTimer();
    }, 10_000);

    if (!this.pushMaxTimer) {
      this.pushMaxTimer = setTimeout(() => {
        if (this.pushTimer) clearTimeout(this.pushTimer);
        this.pushTimer = null;
        this.push().catch(() => {});
        this.pushMaxTimer = null;
      }, 15_000);
    }
  }

  // ── Timer management ────────────────────────────────────────────────────────

  /** Start a 3-minute background sync interval. */
  startTimer(): void {
    if (this.syncInterval) return;
    this.syncInterval = setInterval(() => {
      this.sync().catch(() => {});
    }, 180_000);
  }

  /** Stop all timers (call on unmount / sign-out). */
  stopTimer(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
    }
    this.clearMaxTimer();
  }

  private clearMaxTimer(): void {
    if (this.pushMaxTimer) {
      clearTimeout(this.pushMaxTimer);
      this.pushMaxTimer = null;
    }
  }
}
