# Local-First Operational Log Sync — Design Document

**Status:** Draft
**Date:** 2026-04-16
**Scope:** Replace centralized PostgreSQL storage for inventory data (cabinets, shelves, items) with a local-first op log model, using Supabase Storage as the encrypted sync transport.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Operation Log Format](#2-operation-log-format)
3. [Local Storage Design](#3-local-storage-design)
4. [Sync Protocol](#4-sync-protocol)
5. [Encryption Scheme](#5-encryption-scheme)
6. [Hash / Version Strategy](#6-hash--version-strategy)
7. [Backend API Changes](#7-backend-api-changes)
8. [Frontend Changes](#8-frontend-changes)
9. [Migration Path](#9-migration-path)
10. [What Stays in PostgreSQL](#10-what-stays-in-postgresql)
11. [AI Integration Impact](#11-ai-integration-impact)
12. [Open Questions and Risks](#12-open-questions-and-risks)

---

## 1. Architecture Overview

### Before (Current)

```
Mobile App  ──HTTP──▶  Next.js API  ──Prisma──▶  PostgreSQL
                                                  (all data)
```

Every read and write for cabinets, shelves, and items goes through the API to PostgreSQL. The app has zero offline capability.

### After (Local-First)

```
┌─────────────────────────────────────────────────────────────┐
│                       Mobile App                            │
│                                                             │
│  ┌──────────────┐    ┌───────────────┐   ┌──────────────┐  │
│  │ SQLite DB    │    │ Op Log Queue  │   │ Sync Engine  │  │
│  │ (state view) │◀───│ (pending ops) │──▶│              │  │
│  └──────────────┘    └───────────────┘   └──────┬───────┘  │
│                                                  │          │
└──────────────────────────────────────────────────┼──────────┘
                                                   │ encrypted
                                                   ▼
                                   ┌───────────────────────────┐
                                   │  Supabase Storage          │
                                   │  /sync/{locationId}/       │
                                   │    oplog.enc               │
                                   │    manifest.json           │
                                   └───────────────────────────┘
                                                   ▲
┌──────────────────────────────────────────────────┼──────────┐
│  Next.js API  (still exists for)                 │          │
│  - Auth, profiles, locations, invites, members   │          │
│  - Sync coordination (manifest reads/writes)     │          │
│  - AI chat + vision (reads local data from app)  │          │
│  - Encryption key exchange                       │          │
└──────────────────────────────────────────────────┴──────────┘
```

### Key Principle

Every device that shares a location maintains its own SQLite database as the materialized view. The op log in Supabase Storage is the shared source of truth for merging changes between devices. Writes are always local-first — the network is used only for sync, never as a gate.

---

## 2. Operation Log Format

### 2.1 Op Envelope

Every operation shares a common envelope:

```typescript
interface Operation {
  /** UUIDv4 — globally unique, generated on the client */
  id: string;

  /** Monotonically increasing per-device sequence number.
   *  Used for ordering within a single device's stream. */
  seq: number;

  /** ISO-8601 timestamp from the client clock */
  timestamp: string;

  /** Supabase auth user ID of the actor */
  userId: string;

  /** Stable device identifier (persisted in SecureStore) */
  deviceId: string;

  /** The location this op belongs to */
  locationId: string;

  /** Discriminated union tag — see OpPayload below */
  type: OpType;

  /** Type-specific payload */
  payload: OpPayload;
}
```

### 2.2 Operation Types

```typescript
type OpType =
  // Cabinets
  | "add_cabinet"
  | "update_cabinet"
  | "delete_cabinet"
  // Shelves
  | "add_shelf"
  | "update_shelf"
  | "delete_shelf"
  // Items
  | "add_item"
  | "update_item"
  | "delete_item"
  | "batch_add_items"
  // Moves
  | "move_item";
```

### 2.3 Payload Definitions

#### Cabinet Operations

```typescript
interface AddCabinetPayload {
  type: "add_cabinet";
  payload: {
    cabinetId: string;      // client-generated UUIDv4
    name: string;
    description: string | null;
    imagePath: string | null;
    signedImageUrl: string | null;
  };
}

interface UpdateCabinetPayload {
  type: "update_cabinet";
  payload: {
    cabinetId: string;
    /** Only the fields being changed — sparse update */
    changes: Partial<{
      name: string;
      description: string | null;
      imagePath: string | null;
      signedImageUrl: string | null;
    }>;
  };
}

interface DeleteCabinetPayload {
  type: "delete_cabinet";
  payload: {
    cabinetId: string;
    /** Cascades: the client must also emit delete ops for all
     *  shelves and items within this cabinet, inline in this payload,
     *  so that other devices can clean up without additional queries. */
    cascadedShelfIds: string[];
    cascadedItemIds: string[];
  };
}
```

#### Shelf Operations

```typescript
interface AddShelfPayload {
  type: "add_shelf";
  payload: {
    shelfId: string;        // client-generated UUIDv4
    cabinetId: string;
    name: string;
    position: number;
    imagePath: string | null;
    signedImageUrl: string | null;
  };
}

interface UpdateShelfPayload {
  type: "update_shelf";
  payload: {
    shelfId: string;
    changes: Partial<{
      name: string;
      position: number;
      imagePath: string | null;
      signedImageUrl: string | null;
    }>;
  };
}

interface DeleteShelfPayload {
  type: "delete_shelf";
  payload: {
    shelfId: string;
    /** Items on this shelf are orphaned to the parent cabinet (shelfId = null),
     *  not deleted. The client emits move_item ops for each. */
    orphanedItemIds: string[];
  };
}
```

#### Item Operations

```typescript
interface AddItemPayload {
  type: "add_item";
  payload: {
    itemId: string;          // client-generated UUIDv4
    cabinetId: string;
    shelfId: string | null;
    name: string;
    description: string | null;
    quantity: number;
    itemType: ItemType;      // reuse existing enum
    imagePath: string | null;
    signedImageUrl: string | null;
    tags: string[];
  };
}

interface UpdateItemPayload {
  type: "update_item";
  payload: {
    itemId: string;
    changes: Partial<{
      name: string;
      description: string | null;
      quantity: number;
      itemType: ItemType;
      imagePath: string | null;
      signedImageUrl: string | null;
      tags: string[];
    }>;
  };
}

interface DeleteItemPayload {
  type: "delete_item";
  payload: {
    itemId: string;
  };
}

interface BatchAddItemsPayload {
  type: "batch_add_items";
  payload: {
    cabinetId: string;
    shelfId: string | null;
    items: Array<{
      itemId: string;        // client-generated UUIDv4 per item
      name: string;
      quantity: number;
      itemType: ItemType;
      description: string | null;
      tags: string[];
    }>;
  };
}

interface MoveItemPayload {
  type: "move_item";
  payload: {
    itemId: string;
    fromCabinetId: string;
    fromShelfId: string | null;
    toCabinetId: string;
    toShelfId: string | null;
  };
}
```

### 2.4 Op Payload Union

```typescript
type OpPayload =
  | AddCabinetPayload
  | UpdateCabinetPayload
  | DeleteCabinetPayload
  | AddShelfPayload
  | UpdateShelfPayload
  | DeleteShelfPayload
  | AddItemPayload
  | UpdateItemPayload
  | DeleteItemPayload
  | BatchAddItemsPayload
  | MoveItemPayload;
```

### 2.5 Design Decisions

- **Client-generated IDs**: All entity IDs are UUIDv4 generated on the device at creation time. This eliminates the need for a server round-trip to obtain an ID before writing.
- **Sparse updates**: Update ops carry only the changed fields. During materialization, each update is merged onto the existing entity state.
- **Soft-delete semantics preserved**: Delete ops set `deletedAt` on the materialized entity. The entity row remains in SQLite for consistency but is filtered from all queries.
- **Cascade in payload**: When deleting a cabinet, the op includes the IDs of all child shelves and items being cascaded. This ensures receiving devices can apply the full cascade without needing to query their local DB for children.

---

## 3. Local Storage Design

### 3.1 Technology Choice: SQLite via `expo-sqlite`

**Why SQLite over a JSON file:**
- Fast indexed queries for search, filtering by cabinet/shelf, and type filtering
- Supports the existing UI patterns (list with counts, search with pagination)
- Atomic transactions for applying batches of ops
- `expo-sqlite` is built into Expo SDK 55, no native module installation needed

### 3.2 SQLite Schema

The local database mirrors the current Prisma models but is device-local. One database file per user account.

```sql
-- Tracks which ops have been applied and synced
CREATE TABLE IF NOT EXISTS sync_meta (
  location_id TEXT NOT NULL,
  -- The sequence number of the last op WE applied from the remote log
  remote_seq  INTEGER NOT NULL DEFAULT 0,
  -- SHA-256 hash of the remote oplog file at last pull
  remote_hash TEXT,
  -- Timestamp of last successful sync
  last_synced_at TEXT,
  PRIMARY KEY (location_id)
);

-- Pending ops that haven't been pushed to remote yet
CREATE TABLE IF NOT EXISTS pending_ops (
  id          TEXT PRIMARY KEY,
  location_id TEXT NOT NULL,
  seq         INTEGER NOT NULL,
  timestamp   TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  device_id   TEXT NOT NULL,
  type        TEXT NOT NULL,
  payload     TEXT NOT NULL,  -- JSON string
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  INDEX idx_pending_location (location_id)
);

-- Materialized inventory entities
CREATE TABLE IF NOT EXISTS cabinets (
  id               TEXT PRIMARY KEY,
  location_id      TEXT NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  image_path       TEXT,
  signed_image_url TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT,
  INDEX idx_cab_location (location_id),
  INDEX idx_cab_deleted (deleted_at)
);

CREATE TABLE IF NOT EXISTS shelves (
  id               TEXT PRIMARY KEY,
  cabinet_id       TEXT NOT NULL,
  name             TEXT NOT NULL,
  position         INTEGER NOT NULL DEFAULT 0,
  image_path       TEXT,
  signed_image_url TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT,
  INDEX idx_shelf_cabinet (cabinet_id),
  INDEX idx_shelf_deleted (deleted_at)
);

CREATE TABLE IF NOT EXISTS items (
  id               TEXT PRIMARY KEY,
  cabinet_id       TEXT NOT NULL,
  shelf_id         TEXT,
  name             TEXT NOT NULL,
  description      TEXT,
  quantity          INTEGER NOT NULL DEFAULT 1,
  item_type        TEXT NOT NULL DEFAULT 'OTHER',
  image_path       TEXT,
  signed_image_url TEXT,
  tags             TEXT NOT NULL DEFAULT '[]',  -- JSON array
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT,
  INDEX idx_item_cabinet (cabinet_id),
  INDEX idx_item_shelf (shelf_id),
  INDEX idx_item_deleted (deleted_at)
);

-- FTS5 virtual table for full-text search (replaces PostgreSQL tsvector)
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  name,
  description,
  tags,
  content='items',
  content_rowid='rowid'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, name, description, tags)
  VALUES (new.rowid, new.name, new.description, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, name, description, tags)
  VALUES('delete', old.rowid, old.name, old.description, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, name, description, tags)
  VALUES('delete', old.rowid, old.name, old.description, old.tags);
  INSERT INTO items_fts(rowid, name, description, tags)
  VALUES (new.rowid, new.name, new.description, new.tags);
END;
```

### 3.3 Database File Location

```
<Expo FileSystem documentDirectory>/db/lorgyaya.db
```

One database per authenticated user. On sign-out, the database is retained (for offline access if re-authenticated). On account deletion, the database is deleted.

### 3.4 Op Application (Materializer)

When ops arrive (from local writes or remote sync), they are applied to the SQLite tables through a materializer function:

```typescript
function applyOp(db: SQLiteDatabase, op: Operation): void {
  const now = op.timestamp;

  switch (op.type) {
    case "add_cabinet":
      db.runSync(
        `INSERT OR IGNORE INTO cabinets
         (id, location_id, name, description, image_path, signed_image_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [op.payload.cabinetId, op.locationId, op.payload.name,
         op.payload.description, op.payload.imagePath,
         op.payload.signedImageUrl, now, now]
      );
      break;

    case "update_cabinet": {
      const sets: string[] = [];
      const values: unknown[] = [];
      for (const [key, val] of Object.entries(op.payload.changes)) {
        sets.push(`${toSnakeCase(key)} = ?`);
        values.push(val);
      }
      sets.push("updated_at = ?");
      values.push(now);
      values.push(op.payload.cabinetId);
      db.runSync(
        `UPDATE cabinets SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
        values
      );
      break;
    }

    case "delete_cabinet":
      db.runSync(
        `UPDATE cabinets SET deleted_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, op.payload.cabinetId]
      );
      // Cascade
      for (const shelfId of op.payload.cascadedShelfIds) {
        db.runSync(
          `UPDATE shelves SET deleted_at = ?, updated_at = ? WHERE id = ?`,
          [now, now, shelfId]
        );
      }
      for (const itemId of op.payload.cascadedItemIds) {
        db.runSync(
          `UPDATE items SET deleted_at = ?, updated_at = ? WHERE id = ?`,
          [now, now, itemId]
        );
      }
      break;

    // ... analogous for shelf and item operations
  }
}
```

Key behaviors:
- `INSERT OR IGNORE` for add ops ensures idempotency — replaying the same op twice is safe.
- Update ops only touch fields present in `changes`, preserving other fields.
- Delete ops set `deleted_at` rather than removing rows.
- Batch add items iterates the items array and inserts each.
- All ops for a single location are applied within a SQLite transaction for atomicity.

### 3.5 Local Write Flow

When the user creates/updates/deletes an entity:

1. Construct the `Operation` object with a new UUIDv4 `id`, incrementing `seq`, and current timestamp.
2. Within a single SQLite transaction:
   a. Insert the op into `pending_ops`.
   b. Apply the op to the materialized tables via `applyOp()`.
3. The UI reads from the materialized tables and updates immediately (optimistic by nature).
4. The sync engine is notified that there are pending ops (triggers debounced push).

---

## 4. Sync Protocol

### 4.1 Remote Storage Layout

Each location has a directory in Supabase Storage:

```
sync/
  {locationId}/
    oplog.enc          -- encrypted, append-only log of all ops (NDJSON, encrypted as a whole)
    manifest.json      -- unencrypted metadata for change detection
```

**manifest.json** structure:

```typescript
interface SyncManifest {
  /** locationId for verification */
  locationId: string;
  /** Total number of ops in the log */
  opCount: number;
  /** SHA-256 hash of the decrypted oplog content */
  contentHash: string;
  /** ISO-8601 timestamp of last modification */
  lastModified: string;
  /** Map of deviceId → highest seq number in the log */
  deviceSeqs: Record<string, number>;
  /** Schema version for forward compatibility */
  schemaVersion: number;
}
```

The manifest is NOT encrypted because it contains no inventory data — only counts, hashes, and device sequence numbers. This allows cheap change detection without downloading or decrypting the full log.

### 4.2 Op Log File Format

The decrypted op log is **newline-delimited JSON (NDJSON)** — one `Operation` per line, sorted by `(timestamp, deviceId, seq)`. This ordering produces a deterministic total order even when clocks differ slightly between devices.

```
{"id":"...","seq":1,"timestamp":"2026-04-16T10:00:00.000Z","userId":"...","deviceId":"dev-A","locationId":"...","type":"add_cabinet","payload":{...}}
{"id":"...","seq":2,"timestamp":"2026-04-16T10:00:01.000Z","userId":"...","deviceId":"dev-A","locationId":"...","type":"add_item","payload":{...}}
{"id":"...","seq":1,"timestamp":"2026-04-16T10:00:05.000Z","userId":"...","deviceId":"dev-B","locationId":"...","type":"add_item","payload":{...}}
```

### 4.3 Sync Flows

#### 4.3.1 App Opens (Pull)

```
1. For each location the user has access to:
   a. GET manifest.json from Supabase Storage
   b. Compare manifest.contentHash against sync_meta.remote_hash
   c. If hashes match → no changes, skip
   d. If hashes differ:
      i.   Download oplog.enc
      ii.  Decrypt using the location's encryption key
      iii. Parse the NDJSON log
      iv.  Filter to ops with seq > our last-known remote_seq per device
           (using manifest.deviceSeqs vs local tracking)
      v.   Apply new ops to SQLite via applyOp() in a transaction
      vi.  Update sync_meta with new remote_hash and remote_seq
```

**Optimization**: Since we track per-device sequence numbers, we can compute exactly which ops are new. However, because the file is encrypted as a whole, we must download the entire file. For v1 this is acceptable — location op logs will be small (hundreds of ops, tens of KB). In a future version we can shard the log by time period.

#### 4.3.2 User Makes a Change (Local Write + Debounced Push)

```
1. User action triggers UI handler
2. Construct Operation, write to pending_ops + materialize → instant UI update
3. Mark sync engine as "dirty"
4. Debounce timer starts (10 seconds)
5. When timer fires (or reaches 15-second max delay):
   a. Acquire location-level push lock (prevents concurrent pushes for same location)
   b. Pull first (same flow as 4.3.1) to get latest remote state
   c. Read all pending_ops for this location
   d. Download current oplog.enc, decrypt
   e. Append our pending ops to the decrypted log
   f. Re-sort by (timestamp, deviceId, seq)
   g. Encrypt the full log
   h. Upload oplog.enc (overwrite)
   i. Compute new contentHash, update manifest.json, upload
   j. On success: delete pushed ops from pending_ops, update sync_meta
   k. Release push lock
```

**Debounce strategy**: Use a 10-second debounce with a 15-second max delay. If the user makes rapid changes (editing name, adjusting quantity), they batch into a single push. If the user stops typing for 10 seconds, push fires. If continuous editing goes on for 15 seconds, push fires anyway.

#### 4.3.3 App Backgrounds (Flush)

```
1. Expo AppState listener detects "background" or "inactive"
2. If any pending_ops exist:
   a. Cancel any pending debounce timer
   b. Execute immediate push (same flow as 4.3.2 steps a–k)
   c. Use Expo TaskManager for background task if the push needs > 1 second
3. If no pending_ops, no-op
```

#### 4.3.4 Timer Fires (Bidirectional Sync)

```
1. Timer fires every 3 minutes while app is in foreground
2. Pull latest for all locations (4.3.1)
3. If any pending_ops exist, push them (4.3.2)
4. This catches cases where another device pushed changes while this
   device was idle but foregrounded
```

#### 4.3.5 App Foreground (Resume)

```
1. Expo AppState listener detects "active"
2. Pull latest for all locations (4.3.1)
3. If any pending_ops exist (from before backgrounding that failed to flush),
   push them (4.3.2)
```

### 4.4 Conflict Resolution

Because the op log is append-only and ops are applied in deterministic order `(timestamp, deviceId, seq)`, true conflicts are rare. All devices that have the same set of ops will converge to the same state. However, some semantic conflicts can occur:

#### Last-Write-Wins for Field Updates

When two users update the same field on the same entity concurrently:

```
Device A: update_item { itemId: "x", changes: { name: "Soup" } } at T=10
Device B: update_item { itemId: "x", changes: { name: "Tomato Soup" } } at T=12
```

Both ops are stored in the log. When materialized in order, Device B's change wins because it has a later timestamp. This is **last-write-wins (LWW) per field**. Since updates are sparse (only changed fields), concurrent edits to different fields on the same entity merge cleanly:

```
Device A: update_item { itemId: "x", changes: { name: "Soup" } } at T=10
Device B: update_item { itemId: "x", changes: { quantity: 5 } } at T=12
Result: name="Soup", quantity=5  (both applied, no conflict)
```

#### Delete vs. Update

If Device A deletes an entity and Device B updates it concurrently:

- In log order, the delete sets `deleted_at`.
- If the update comes after the delete in the sorted log, the `WHERE deleted_at IS NULL` clause causes it to be a no-op.
- If the update comes before the delete, it applies, then the delete overrides.
- Either way, the entity ends up deleted. This is the correct behavior — delete should win.

#### Add Idempotency

If the same `add_*` op is received twice (e.g., retry after network failure), `INSERT OR IGNORE` ensures no duplicate is created.

#### Clock Skew

Client clocks may differ. The sort order `(timestamp, deviceId, seq)` is deterministic regardless of clock accuracy. In the worst case, a device with a significantly wrong clock will have its ops ordered incorrectly relative to real time, but all devices will agree on the ordering — consistency is preserved even if the ordering isn't perfectly causal.

For v1 this is acceptable. A future enhancement could use hybrid logical clocks (HLC) for better causal ordering.

### 4.5 Push Contention (Two Devices Push Simultaneously)

When two devices try to upload `oplog.enc` at the same time for the same location:

1. Both download the current log.
2. Both append their pending ops.
3. Both try to upload.
4. One upload overwrites the other — the second uploader's pending ops from the first uploader are lost.

**Mitigation — optimistic locking via manifest**:

```
1. Before uploading, read manifest.json and note the contentHash.
2. After uploading oplog.enc, read manifest.json again.
3. If contentHash changed between step 1 and step 2, another device pushed.
4. Re-download, re-merge, re-upload (retry up to 3 times).
5. After uploading oplog.enc, upload manifest.json with the new hash.
```

Since Supabase Storage doesn't support conditional writes (ETags), this is a best-effort check. The window for a race is small (the time between our upload and the manifest check). For a household app with 2-4 users, this is extremely unlikely. If it does happen, the next sync cycle (3-minute timer) will detect the hash mismatch and re-pull, recovering the lost ops from the overwritten device's pending_ops (which are only cleared after confirmed push).

**Critical safety property**: Pending ops are NOT deleted from the local `pending_ops` table until the push is confirmed. If a push is lost due to contention, the ops survive locally and will be re-pushed on the next cycle.

### 4.6 Log Compaction

Over time, the op log grows unbounded — adds, updates, deletes, renames all accumulate. A location used for a year could have thousands of ops, making sync slow for new devices or re-installs. Log compaction solves this by periodically replacing the full op history with a snapshot of the current state.

#### How It Works

1. The pushing device reads the current materialized state from local SQLite.
2. For every entity that exists (not soft-deleted), it generates a single `add_*` op with the entity's current field values.
3. The old op log is replaced entirely with these snapshot ops.
4. The manifest's `opCount` is updated, `deviceSeqs` is reset, and a `compactedAt` timestamp is set.
5. The compacted log is encrypted and uploaded as the new `oplog.enc`.

```
Before compaction:  847 ops (6 months of adds, updates, deletes)
After compaction:    63 ops (one add_* per living entity)
```

Deleted entities disappear entirely. Update chains collapse into a single add with the final values. The history is gone, but the current state is preserved exactly.

#### Snapshot Op Format

Snapshot ops reuse the existing `add_*` op types but with a special `deviceId`:

```typescript
{
  id: uuid(),
  seq: 1,                          // sequential from 1
  timestamp: new Date().toISOString(),
  userId: currentUserId,
  deviceId: "compaction",           // signals this is a snapshot op
  locationId: locationId,
  type: "add_cabinet",
  payload: { /* current field values */ }
}
```

The `"compaction"` device ID distinguishes snapshot ops from regular ops. Other devices receiving this log treat them identically to normal adds — `INSERT OR IGNORE` ensures idempotency.

#### When to Compact

Compaction is triggered during a **push** when either threshold is met:

- **Op count exceeds 500** — checked after merging pending ops into the log
- **Last compaction was more than 30 days ago** — tracked via `compactedAt` in the manifest

Only one device needs to compact. Other devices simply pull the compacted log on their next sync — it's a valid op log, just shorter.

#### Manifest Changes

```typescript
interface SyncManifest {
  locationId: string;
  opCount: number;
  contentHash: string;
  lastModified: string;
  deviceSeqs: Record<string, number>;
  schemaVersion: number;
  compactedAt: string | null;        // ISO-8601 timestamp of last compaction
}
```

After compaction, `deviceSeqs` is reset to `{ "compaction": opCount }` since all ops now come from the compaction device. Real device sequences restart from the next push.

#### Safety

- Compaction only happens during a push that already holds the location lock.
- If a concurrent push overwrites the compacted log, the compacting device detects the hash mismatch on the next cycle, re-pulls, and the compacted state is rebuilt from whatever the current log is.
- Pending ops from other devices are not lost — they survive in those devices' `pending_ops` tables and will be pushed on their next sync cycle, appending onto the compacted log.

---

## 5. Encryption Scheme

### 5.1 Key Generation

When a location is created, the client generates:

- A 256-bit AES-GCM encryption key (the "location key")
- The key is generated using `crypto.getRandomValues()` on the device

```typescript
const locationKey = crypto.getRandomValues(new Uint8Array(32));
```

### 5.2 Key Storage on Device

The location key is stored in `expo-secure-store` under the key:

```
location_key_{locationId}
```

SecureStore provides hardware-backed encryption (Keychain on iOS, Keystore on Android).

### 5.3 Key Exchange for Shared Locations

When the location owner invites a housemate, the encryption key must be shared. This uses a server-mediated key exchange stored in PostgreSQL:

#### Database Addition

New table in Prisma schema:

```prisma
model LocationKeyShare {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  locationId    String   @map("location_id") @db.Uuid
  recipientId   String   @map("recipient_id")  // invited user's Supabase userId
  encryptedKey  String   @map("encrypted_key") @db.Text  // base64
  nonce         String   @db.Text  // base64
  createdAt     DateTime @default(now()) @map("created_at")
  claimedAt     DateTime? @map("claimed_at")

  location Location @relation(fields: [locationId], references: [id])

  @@unique([locationId, recipientId])
  @@index([recipientId, claimedAt])
  @@map("location_key_shares")
}
```

#### Key Share Flow

```
1. Owner invites User B (existing invite flow via POST /api/locations/{id}/invites)
2. User B accepts the invite (PATCH /api/invites/{id} with status=ACCEPTED)
3. Owner's device detects the acceptance (polling or push notification)
4. Owner's device:
   a. Derives a shared secret using the recipient's public key
      OR (simpler for v1):
      Encrypts the location key using a key derived from the invite ID + a secret
      stored on the server
   b. Uploads the encrypted location key:
      POST /api/locations/{id}/key-share
      { recipientId, encryptedKey, nonce }
5. User B's device:
   a. Checks for pending key shares: GET /api/key-shares/pending
   b. Downloads the encrypted key
   c. Decrypts it using the corresponding derived key
   d. Stores the decrypted location key in SecureStore
   e. Marks the share as claimed: PATCH /api/key-shares/{id}/claim
```

#### v1 Simplified Key Exchange

For v1, we use a simpler approach that avoids public-key cryptography on device:

1. The server generates a one-time wrapping key for each invite.
2. This wrapping key is stored server-side and delivered to the owner's device when the invite is accepted.
3. The owner encrypts the location key with the wrapping key and uploads it.
4. The invitee retrieves the wrapping key from the server and decrypts the location key.

**Trade-off**: The server briefly knows the wrapping key, so it could theoretically decrypt the location key during the exchange window. This is acceptable for v1 because:
- The server admin is the app developer (us)
- The exchange window is short (seconds)
- Actual inventory data at rest in Storage remains encrypted with the location key, which the server never sees in plaintext

A future version can upgrade to X25519 key agreement for true end-to-end encryption without server trust.

### 5.4 Encrypting the Op Log

```typescript
async function encryptOpLog(
  plaintext: Uint8Array,  // NDJSON bytes
  locationKey: Uint8Array  // 32-byte AES key
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));  // 96-bit IV for AES-GCM
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    await crypto.subtle.importKey("raw", locationKey, "AES-GCM", false, ["encrypt"]),
    plaintext
  );
  return { ciphertext: new Uint8Array(ciphertext), nonce };
}
```

The encrypted file stored in Supabase Storage is:

```
[12 bytes nonce][remaining bytes ciphertext]
```

AES-GCM provides both confidentiality and integrity (tampering is detected).

### 5.5 Encryption Library

Use `expo-crypto` for `getRandomValues()` and the Web Crypto API (`crypto.subtle`) which is available in Hermes (React Native's JS engine) as of React Native 0.76+. No additional native modules needed.

---

## 6. Hash / Version Strategy

### 6.1 Content Hash

The `contentHash` in `manifest.json` is a SHA-256 hex digest of the **decrypted** NDJSON content. This means:

- Two different encryptions of the same content produce the same hash (deterministic change detection).
- The hash is computed BEFORE encryption and stored in the unencrypted manifest.
- Comparing hashes is a single HTTP GET of `manifest.json` (~200 bytes) rather than downloading the entire encrypted log.

```typescript
async function computeContentHash(ndjsonBytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", ndjsonBytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
```

### 6.2 Per-Device Sequence Tracking

The manifest includes `deviceSeqs`:

```json
{
  "deviceSeqs": {
    "dev-abc123": 47,
    "dev-def456": 12
  }
}
```

This tells each device: "the log contains ops up through seq 47 from device abc123 and seq 12 from device def456." A device can then determine which of its pending ops are already in the log.

### 6.3 Schema Version

The `schemaVersion` field (integer, starting at 1) allows forward-compatible changes to the op format. If a device encounters a `schemaVersion` higher than it understands, it should:

1. Still pull and store the raw op log.
2. Skip materializing ops with unknown `type` values.
3. Prompt the user to update the app.

### 6.4 Change Detection Summary

```
App opens
  → GET manifest.json (tiny, ~200 bytes, unencrypted)
  → Compare contentHash to local sync_meta.remote_hash
  → Same? → done (no download)
  → Different? → download oplog.enc, decrypt, apply new ops
```

This is extremely efficient: a single small HTTP request per location to check for changes.

---

## 7. Backend API Changes

### 7.1 Endpoints That Stay Unchanged

| Endpoint | Reason |
|---|---|
| `POST /api/profiles` | Profile creation stays in PostgreSQL |
| `GET /api/profiles/me` | Profile data stays centralized |
| `PATCH /api/profiles` | Profile update stays centralized |
| `GET /api/profiles/check-username` | Username check stays centralized |
| `DELETE /api/account` | Account deletion stays centralized (+ trigger local DB cleanup) |
| `GET /api/locations` | Location metadata stays in PostgreSQL |
| `POST /api/locations` | Location creation stays (+ triggers key generation on client) |
| `GET /api/locations/[id]` | Location detail stays |
| `PATCH /api/locations/[id]` | Location metadata update stays |
| `DELETE /api/locations/[id]` | Location deletion stays (+ triggers remote oplog cleanup) |
| `POST /api/locations/[id]/invites` | Invite system stays centralized |
| `GET /api/locations/[id]/members` | Member management stays centralized |
| `GET /api/invites` | Invite listing stays centralized |
| `PATCH /api/invites/[id]` | Invite accept/decline stays (+ triggers key exchange) |
| `GET /api/health` | Health check stays |

### 7.2 Endpoints That Get Removed

These endpoints will be deprecated and eventually removed after migration:

| Endpoint | Replacement |
|---|---|
| `POST /api/cabinets` | Local op: `add_cabinet` |
| `GET /api/cabinets/[id]` | Local SQLite query |
| `PATCH /api/cabinets/[id]` | Local op: `update_cabinet` |
| `DELETE /api/cabinets/[id]` | Local op: `delete_cabinet` |
| `GET /api/cabinets/[id]/shelves` | Local SQLite query |
| `GET /api/cabinets/[id]/items` | Local SQLite query |
| `POST /api/shelves` | Local op: `add_shelf` |
| `GET /api/shelves/[id]` | Local SQLite query |
| `PATCH /api/shelves/[id]` | Local op: `update_shelf` |
| `DELETE /api/shelves/[id]` | Local op: `delete_shelf` |
| `GET /api/shelves/[id]/items` | Local SQLite query |
| `POST /api/items` | Local op: `add_item` |
| `GET /api/items/[id]` | Local SQLite query |
| `PATCH /api/items/[id]` | Local op: `update_item` |
| `DELETE /api/items/[id]` | Local op: `delete_item` |
| `POST /api/items/batch` | Local op: `batch_add_items` |
| `GET /api/search` | Local SQLite FTS5 query |
| `GET /api/inventory/full` | Local SQLite query (flat inventory built on device) |
| `GET /api/locations/[id]/cabinets` | Local SQLite query |

### 7.3 New Endpoints

#### Sync Coordination

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/sync/[locationId]/manifest` | Get the manifest for a location's op log. Returns the manifest JSON if the user has access. Used for hash comparison. |
| `POST` | `/api/sync/[locationId]/pull` | Returns a signed download URL for `oplog.enc`. Verifies access. |
| `POST` | `/api/sync/[locationId]/push` | Accepts the new `oplog.enc` file and updated manifest. Verifies access. Validates that the manifest's opCount >= previous opCount (append-only guard). |

**Why proxy through the API instead of direct Supabase Storage access?**
- Access control: The API verifies location membership before granting access. Supabase Storage RLS policies alone cannot express the LocationMember join.
- Consistency: The API can enforce append-only semantics (opCount can only increase).
- Signed URLs: The API generates short-lived (5-minute) signed URLs for download, keeping the storage bucket private.

```typescript
// GET /api/sync/[locationId]/manifest
interface ManifestResponse {
  data: SyncManifest | null;  // null if no oplog exists yet (new location)
}

// POST /api/sync/[locationId]/pull
interface PullResponse {
  data: {
    downloadUrl: string;  // signed URL, 5-minute expiry
    manifest: SyncManifest;
  };
}

// POST /api/sync/[locationId]/push
// Request: multipart/form-data with:
//   - file: oplog.enc (encrypted bytes)
//   - manifest: JSON string of SyncManifest
interface PushResponse {
  data: {
    accepted: boolean;
    manifest: SyncManifest;
  };
}
```

#### Key Exchange

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/locations/[id]/key-share` | Owner uploads encrypted location key for a specific recipient |
| `GET` | `/api/key-shares/pending` | Get all unclaimed key shares for the authenticated user |
| `PATCH` | `/api/key-shares/[id]/claim` | Mark a key share as claimed (after the recipient decrypts and stores the key) |

```typescript
// POST /api/locations/[id]/key-share
interface KeyShareRequest {
  recipientId: string;
  encryptedKey: string;  // base64
  nonce: string;          // base64
}

// GET /api/key-shares/pending
interface PendingKeySharesResponse {
  data: Array<{
    id: string;
    locationId: string;
    encryptedKey: string;
    nonce: string;
    createdAt: string;
  }>;
}
```

#### Migration

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/sync/[locationId]/export` | One-time export of all cabinets, shelves, and items from PostgreSQL for this location, formatted as an array of ops. Used during migration. |

### 7.4 Supabase Storage Bucket

Create a new private bucket: `sync-logs`

Storage layout:
```
sync-logs/
  {locationId}/
    oplog.enc
    manifest.json
```

Bucket RLS: All access through signed URLs generated by the API. No direct public access.

---

## 8. Frontend Changes

### 8.1 New Mobile Packages

```json
{
  "expo-sqlite": "~15.x",
  "expo-crypto": "~14.x",
  "expo-file-system": "~18.x"  // already present for image uploads
}
```

### 8.2 New Module: `mobile/lib/local-db/`

```
mobile/lib/local-db/
  ├── database.ts           # SQLite initialization, migrations, singleton
  ├── schema.ts             # SQL CREATE TABLE statements as constants
  ├── materializer.ts       # applyOp() — applies ops to materialized tables
  ├── queries/
  │   ├── cabinets.ts       # getCabinets(locationId), getCabinet(id), getCabinetWithCounts(id)
  │   ├── shelves.ts        # getShelves(cabinetId), getShelf(id), getShelvesWithCounts(cabinetId)
  │   ├── items.ts          # getItems(cabinetId, shelfFilter?), getItem(id), searchItems(query)
  │   └── inventory.ts      # getFlatInventory() — replaces GET /api/inventory/full
  └── operations.ts         # writeOp(type, payload) — creates op, applies, queues for sync
```

### 8.3 New Module: `mobile/lib/sync/`

```
mobile/lib/sync/
  ├── engine.ts             # SyncEngine class — orchestrates pull/push/timer
  ├── encryption.ts         # encrypt/decrypt helpers using AES-GCM
  ├── manifest.ts           # SyncManifest type + helpers
  ├── oplog-parser.ts       # NDJSON serialize/deserialize
  ├── key-manager.ts        # Location key storage (SecureStore), key exchange
  └── device-id.ts          # Stable device identifier (generated once, stored in SecureStore)
```

### 8.4 New Module: `mobile/lib/hooks/` (additions)

```
mobile/lib/hooks/
  ├── useLocalCabinets.ts   # Replaces React Query for cabinet data
  ├── useLocalShelves.ts    # Replaces React Query for shelf data
  ├── useLocalItems.ts      # Replaces React Query for item data
  ├── useLocalSearch.ts     # Replaces React Query for search
  ├── useLocalInventory.ts  # Replaces React Query for flat inventory
  └── useSyncStatus.ts      # Exposes sync state (pending count, last synced, errors)
```

### 8.5 Hook Design Pattern

The local data hooks replace React Query for inventory data. They follow a reactive pattern using SQLite change subscriptions:

```typescript
// Example: useLocalCabinets.ts
import { useSQLiteQuery } from "./useSQLiteQuery";

interface UseCabinetsResult {
  cabinets: CabinetWithCounts[];
  isLoading: boolean;
  create: (name: string, description?: string) => void;
  update: (id: string, changes: Partial<CabinetFields>) => void;
  remove: (id: string) => void;
}

export function useLocalCabinets(locationId: string): UseCabinetsResult {
  const db = useDatabase();
  const { writeOp } = useOpWriter();

  // Reactive query — re-runs when the cabinets table changes
  const { data: cabinets, isLoading } = useSQLiteQuery(
    ["cabinets", locationId],
    () => queryCabinetsWithCounts(db, locationId)
  );

  const create = useCallback((name: string, description?: string) => {
    writeOp("add_cabinet", {
      cabinetId: uuid.v4(),
      name,
      description: description ?? null,
      imagePath: null,
      signedImageUrl: null,
    }, locationId);
  }, [locationId, writeOp]);

  // ... update, remove similarly

  return { cabinets: cabinets ?? [], isLoading, create, update, remove };
}
```

### 8.6 Reactive SQLite Query Hook

To replace React Query's cache invalidation pattern, we need a way to re-run queries when the underlying tables change. Approach:

```typescript
// mobile/lib/hooks/useSQLiteQuery.ts

/**
 * Subscribes to changes in the local SQLite database.
 * When writeOp() applies a change, it bumps a version counter
 * in a Zustand store. Hooks subscribing to the relevant table
 * re-query.
 *
 * This replaces React Query's queryKey invalidation for local data.
 */
export function useSQLiteQuery<T>(
  key: string[],
  queryFn: () => T
): { data: T | undefined; isLoading: boolean } {
  const version = useLocalDbStore((s) => s.tableVersions[key[0]] ?? 0);
  const [data, setData] = useState<T>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    try {
      const result = queryFn();
      setData(result);
    } finally {
      setIsLoading(false);
    }
  }, [version, ...key]);

  return { data, isLoading };
}
```

When `writeOp()` applies an op, it increments the version counter for the affected table(s) in a Zustand store (`localDbStore`). All `useSQLiteQuery` hooks watching that table re-render.

### 8.7 Zustand Store Addition

```typescript
// mobile/lib/store/local-db-store.ts
interface LocalDbState {
  /** Version counter per table — bumped on local writes to trigger re-renders */
  tableVersions: Record<string, number>;
  bumpTable: (table: string) => void;

  /** Pending op counts per location — shown in UI sync indicators */
  pendingCounts: Record<string, number>;
  setPendingCount: (locationId: string, count: number) => void;

  /** Sync status */
  syncErrors: Record<string, string>;
  lastSynced: Record<string, string>;  // locationId → ISO timestamp
}
```

### 8.8 Screen Changes

All screens that currently use React Query for cabinets, shelves, items, and search must switch to the local hooks. The screen structure remains the same — only the data source changes.

| Screen | Current Data Source | New Data Source |
|---|---|---|
| `locations/[locationId]/index.tsx` | `useQuery(["cabinets", locationId], locationsApi.getCabinets)` | `useLocalCabinets(locationId)` |
| `locations/[locationId]/[cabinetId]/index.tsx` | `useQuery` for shelves + items via API | `useLocalShelves(cabinetId)` + `useLocalItems(cabinetId)` |
| `search/index.tsx` | `useQuery(["search", q], itemsApi.search)` | `useLocalSearch(q)` |
| `assistant.tsx` | `useQuery(["inventory", "full"], inventoryApi.getFull)` | `useLocalInventory()` |

The mutation pattern also changes. Instead of:

```typescript
// Before
const createMutation = useMutation({
  mutationFn: (data) => cabinetsApi.create(data),
  onSuccess: () => queryClient.invalidateQueries(["cabinets", locationId]),
});
```

It becomes:

```typescript
// After
const { create } = useLocalCabinets(locationId);
// create() writes an op → materializes → bumps version → hook re-renders
```

No loading states for writes. No error handling for network failures on writes. The write is always local and always succeeds.

### 8.9 Sync Status UI

Add a small sync indicator to the location detail screen (and optionally the location list):

- Green dot: All synced, no pending ops
- Orange dot + count: N pending ops, waiting to sync
- Red dot: Sync error (with tap to retry)
- Last synced timestamp in location header subtitle

### 8.10 API Layer Changes

The following API modules become unused and should be removed after migration:

- `mobile/lib/api/cabinets.ts` — replaced by local ops
- `mobile/lib/api/items.ts` — replaced by local ops (except `identifyItems` which moves)
- `mobile/lib/api/inventory.ts` — replaced by local query

New API modules:

```
mobile/lib/api/sync.ts       # getManifest, pull, push
mobile/lib/api/key-shares.ts  # pending, claim, create
```

The `locations.ts`, `profiles.ts`, and `invites.ts` API modules stay unchanged.

### 8.11 Image Handling

Images for cabinets, shelves, and items are still stored in Supabase Storage (not in the op log — binary data should not be in the op log). The flow becomes:

1. User takes/selects a photo.
2. Image is compressed and uploaded to Supabase Storage (same as today).
3. A signed URL is generated (same as today — but now client-side using Supabase JS).
4. The `imagePath` and `signedImageUrl` are stored in the op payload.
5. On sync, other devices receive the `signedImageUrl` and can display the image.

**Change from current flow**: Image URL signing currently happens server-side in the API route. With local-first, the client must generate signed URLs itself. The Supabase JS client's `storage.from(bucket).createSignedUrl()` method can do this with the user's auth token.

---

## 9. Migration Path

### 9.1 Strategy: Gradual, Non-Destructive

The migration happens per-location and is triggered by the app, not the server. This ensures users on older app versions continue to work until they update.

### 9.2 Migration Flow

```
1. User updates app to the version with local-first support.
2. On first launch after update:
   a. App detects this is the first run of the new version (flag in AsyncStorage).
   b. For each location the user has access to:
      i.   Call GET /api/sync/{locationId}/export
           → Returns all cabinets, shelves, items as an array of add_* ops
      ii.  Write these ops to the local SQLite database via applyOp()
      iii. Push the initial op log to Supabase Storage (creating oplog.enc + manifest.json)
      iv.  Mark the location as migrated in sync_meta
   c. Set the migration-complete flag.
3. From this point, all reads come from SQLite, all writes go to op log.
```

### 9.3 Export Endpoint

`GET /api/sync/[locationId]/export`

Returns the full inventory for a location as an array of chronologically ordered ops:

```typescript
interface ExportResponse {
  data: {
    ops: Operation[];  // add_cabinet, add_shelf, add_item ops only
    locationId: string;
  };
}
```

The server constructs these ops from the current PostgreSQL data:
- Each cabinet → `add_cabinet` op
- Each shelf → `add_shelf` op
- Each item → `add_item` op
- `timestamp` is set to the entity's `createdAt`
- `userId` is set to the location owner's userId
- `deviceId` is set to `"migration"`
- `seq` is assigned sequentially

### 9.4 First-Migrator Wins

In a shared location, the first device to migrate creates the initial op log. Subsequent devices:

1. Call GET `/api/sync/{locationId}/manifest`
2. If a manifest exists → the location was already migrated by another device
3. Pull the existing op log instead of calling `/export`
4. Populate local SQLite from the pulled ops

### 9.5 PostgreSQL Data Retention

After migration, the cabinets/shelves/items data in PostgreSQL is kept as a read-only archive for 90 days. After 90 days, a background job soft-deletes it. This provides a safety net for rollback.

### 9.6 Rollback Plan

If critical bugs are found:
1. Ship an app update that reads from PostgreSQL again (re-enable old API modules).
2. The 90-day retention window ensures data is still available.
3. Ops created after migration would need to be replayed against PostgreSQL — the export endpoint can be reversed to import ops back into PostgreSQL.

---

## 10. What Stays in PostgreSQL

Explicit and exhaustive list of what remains in PostgreSQL/Prisma:

| Model | Stays? | Reason |
|---|---|---|
| `Profile` | YES | User identity, username uniqueness, avatar |
| `Location` | YES (metadata only) | Name, type, address, ownership. Needed for invite system and access control on sync endpoints. |
| `LocationMember` | YES | Collaboration, invite lifecycle. Server must be the authority on who has access. |
| `LocationKeyShare` | YES (new) | Encryption key exchange for shared locations |
| `Cabinet` | NO → local | Moves to op log |
| `Shelf` | NO → local | Moves to op log |
| `Item` | NO → local | Moves to op log |

### Prisma Schema Changes

**Removals** (after migration period):
- `Cabinet` model
- `Shelf` model
- `Item` model
- Relations from `Location` to `Cabinet`, from `Cabinet` to `Shelf`/`Item`, from `Shelf` to `Item`
- The `ItemType` enum (moves to a TypeScript union in mobile)

**Additions**:
- `LocationKeyShare` model (see section 5.3)

**During migration period**: All models remain in the schema. The API routes for cabinets/shelves/items are kept but marked deprecated. They are not called by the updated mobile app but may be called by older app versions.

---

## 11. AI Integration Impact

### 11.1 Chat Assistant ("Lorgy")

**Current flow:**
1. App calls `GET /api/inventory/full` (server queries PostgreSQL, returns flat inventory)
2. App caches result for 5 minutes (React Query)
3. On each message, app sends `{ message, inventory, history }` to `POST /api/ai/chat`
4. Server builds system prompt with inventory context and streams response

**New flow:**
1. App calls `useLocalInventory()` (queries local SQLite, no network)
2. Data is always fresh (no stale cache — reads directly from materialized view)
3. On each message, app sends `{ message, inventory, history }` to `POST /api/ai/chat` (unchanged)
4. Server builds system prompt and streams response (unchanged)

**What changes:**
- The `inventory` array sent to the chat endpoint is now built locally instead of fetched from the server.
- The `GET /api/inventory/full` endpoint is no longer called.
- The `POST /api/ai/chat` endpoint is UNCHANGED — it already receives the inventory in the request body and does not query the database.

**Implementation in `assistant.tsx`:**

```typescript
// Before
const { data: inventory = [] } = useQuery({
  queryKey: ["inventory", "full"],
  queryFn: () => inventoryApi.getFull(),
  staleTime: 1000 * 60 * 5,
});

// After
const { inventory } = useLocalInventory();
// Always up-to-date, no stale time needed, no network request
```

The `useLocalInventory()` hook runs a SQLite query that joins cabinets, shelves, and items — the same join that `GET /api/inventory/full` does in PostgreSQL today — but locally:

```sql
SELECT
  i.name,
  i.description,
  i.quantity,
  i.item_type AS type,
  i.tags,
  c.name AS cabinet,
  s.name AS shelf,
  l_name AS location,
  l_type AS locationType
FROM items i
JOIN cabinets c ON i.cabinet_id = c.id AND c.deleted_at IS NULL
LEFT JOIN shelves s ON i.shelf_id = s.id AND s.deleted_at IS NULL
WHERE i.deleted_at IS NULL
```

The location name and type are provided via a lightweight context or parameter since they are still fetched from the API (location metadata stays in PostgreSQL).

### 11.2 Vision Item Identification

**Current flow:**
1. App sends `{ imageBase64, mediaType, cabinetId }` to `POST /api/ai/identify-items`
2. Server verifies access to the cabinet via PostgreSQL
3. Server calls Claude Vision to detect items
4. Server queries PostgreSQL for existing items in the cabinet (dedup)
5. Server calls Claude for dedup pass
6. Returns detected items with duplicate flags

**New flow:**
1. App sends `{ imageBase64, mediaType }` to `POST /api/ai/identify-items`
   - No longer sends `cabinetId` — access control is local
2. Server calls Claude Vision to detect items (unchanged)
3. App queries LOCAL SQLite for existing items in the cabinet (dedup happens on device)
4. App calls Claude for dedup pass (or we move dedup to client-side)
5. Returns detected items with duplicate flags

**Two options for the dedup pass:**

**Option A — Server-side dedup (keep current approach):**
- App sends `{ imageBase64, mediaType, existingItems: [...] }` where `existingItems` is the list of items already in the cabinet, read from local SQLite.
- Server does vision pass + dedup pass, returns results.
- Pro: No change to AI logic. Con: Sends cabinet contents to the server (partially defeats privacy goal).

**Option B — Client-side dedup (fully local):**
- App sends `{ imageBase64, mediaType }` — vision only.
- Server returns raw detections (name, type, confidence, quantity).
- App does dedup locally by fuzzy-matching detection names against SQLite items.
- Pro: Cabinet contents never leave the device. Con: Need to implement fuzzy matching on device (simple Levenshtein or substring match is sufficient).

**Recommendation: Option A for v1.** The existing items sent for dedup are just names and quantities — low sensitivity. The actual inventory data in the op log remains encrypted. Move to Option B in a future iteration for full privacy.

### 11.3 Search

**Current flow:** App calls `GET /api/search?q=...`, server queries PostgreSQL with `tsvector`.

**New flow:** App queries local SQLite FTS5 table directly. No network request. Results are instant.

```typescript
function searchItems(db: SQLiteDatabase, query: string): ItemWithLocation[] {
  return db.getAllSync(
    `SELECT i.*, c.name as cabinet_name, c.location_id
     FROM items_fts
     JOIN items i ON items_fts.rowid = i.rowid
     JOIN cabinets c ON i.cabinet_id = c.id
     WHERE items_fts MATCH ? AND i.deleted_at IS NULL AND c.deleted_at IS NULL
     ORDER BY rank
     LIMIT 50`,
    [query]
  );
}
```

---

## 12. Open Questions and Risks

### 12.1 Open Questions

1. **Op log size over time**: ~~Should we implement log compaction?~~ **Resolved — yes, included in v1.** See section 4.6. Compaction triggers at 500 ops or 30 days, whichever comes first.

2. **Photo deletion on cascade**: When a cabinet is deleted and has items with photos, should those photos be cleaned up from Supabase Storage? Currently the server handles this. With local-first, the deleting device should also delete the storage files. What if the device is offline?

3. **Background sync on iOS**: iOS severely limits background execution. `expo-task-manager` with background fetch is unreliable. Is the "flush on background" approach sufficient, or do we need push notifications to trigger sync?

4. **Multi-device same user**: A single user with two devices (phone + tablet). Both generate ops with different `deviceId` values. The sync protocol handles this correctly, but the UX of seeing "X pending" on one device while the other is pushing needs consideration.

5. **Location deletion**: When a location is deleted (PostgreSQL), what happens to the op log in Storage? The API should delete the storage files. But existing devices with cached SQLite data should detect this and clean up on next sync attempt.

### 12.2 Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Clock skew between devices causes confusing op ordering | Low — ordering is consistent, just not perfectly causal | Accept for v1. Document. Consider HLC for v2. |
| Encryption key lost (user uninstalls app, no other devices) | Data in Storage is unrecoverable | Show clear warning before uninstall. Potentially store a recovery key in the user's profile (server-encrypted). |
| Supabase Storage outage | Users can still read and write locally. Sync is delayed. | Display "offline" indicator. Ops queue in pending_ops indefinitely. |
| Op log grows very large (>1MB) for active locations | Sync becomes slow (must download full file) | Log compaction included in v1 (section 4.6): snapshot current state at 500 ops or 30 days. |
| Race condition on push with >2 concurrent devices | One device's ops may be temporarily lost from the remote log | Pending ops survive locally and re-push on next cycle. Eventually consistent. |

### 12.3 Future Enhancements (Out of Scope for v1)

- **Hybrid Logical Clocks (HLC)** for causal ordering without clock sync
- **Incremental sync** — download only new ops instead of the full file (requires sharding the log by time window)
- **End-to-end key exchange** using X25519 (removes server trust from key exchange)
- **Push notifications** for real-time sync triggers
- **Client-side dedup** for vision identification (Option B from section 11.2)
- **Conflict UI** — surface "someone else changed X" notifications to the user

---

## Appendix A: Implementation Order

The implementation should proceed in this order to minimize risk and enable incremental testing:

### Phase 1 — Local Storage Foundation (Frontend)

1. Set up `expo-sqlite` database initialization and schema
2. Implement the materializer (`applyOp()`)
3. Implement local query functions (cabinets, shelves, items, search, inventory)
4. Implement `useSQLiteQuery` reactive hook + Zustand version store
5. Implement `writeOp()` — creates ops, applies locally, queues for sync
6. Write unit tests for materializer and queries

**Milestone**: App can create, read, update, delete cabinets/shelves/items entirely locally with no network.

### Phase 2 — Sync Engine (Frontend + Backend)

7. Generate stable device ID
8. Implement encryption/decryption helpers
9. Implement NDJSON serializer/parser
10. Build sync API endpoints (manifest, pull, push)
11. Build `SyncEngine` class (pull, push, debounce, timer)
12. Implement log compaction (trigger at 500 ops or 30 days, snapshot current state, replace log)
13. Wire AppState listeners (foreground pull, background flush)
14. Integration test: two devices syncing a shared location
15. Test compaction: verify compacted log produces identical materialized state

**Milestone**: Two devices can sync inventory changes through Supabase Storage, with automatic log compaction.

### Phase 3 — Key Exchange (Backend + Frontend)

14. Add `LocationKeyShare` model to Prisma schema
15. Build key exchange API endpoints
16. Build `KeyManager` on mobile (generate, store, retrieve, share)
17. Wire key exchange into invite acceptance flow
18. Test shared location sync between two different users

**Milestone**: Housemates can share an encrypted location.

### Phase 4 — Migration (Backend + Frontend)

19. Build the export endpoint
20. Build the migration flow (first launch detection, per-location export, initial push)
21. Test migration with various data shapes (empty locations, large inventories, shared locations)
22. Handle first-migrator-wins for shared locations

**Milestone**: Existing users can migrate seamlessly.

### Phase 5 — Screen Rewiring (Frontend)

23. Replace React Query hooks with local hooks on all inventory screens
24. Update `assistant.tsx` to use `useLocalInventory()`
25. Update `useItemIdentifier` for new dedup flow
26. Add sync status indicators to location screens
27. Remove old API modules

**Milestone**: Full local-first app with sync.

### Phase 6 — Cleanup

28. Deprecate old cabinet/shelf/item API endpoints
29. Update ARCHITECTURE.md
30. Update tests
31. Monitor and fix edge cases in production

---

## Appendix B: File Manifest

### New Files — Backend

```
src/app/api/sync/[locationId]/manifest/route.ts
src/app/api/sync/[locationId]/pull/route.ts
src/app/api/sync/[locationId]/push/route.ts
src/app/api/sync/[locationId]/export/route.ts
src/app/api/locations/[id]/key-share/route.ts
src/app/api/key-shares/pending/route.ts
src/app/api/key-shares/[id]/claim/route.ts
src/lib/validations/sync.ts
src/lib/validations/key-share.ts
prisma/migrations/XXXX_add_location_key_share/migration.sql
```

### New Files — Frontend

```
mobile/lib/local-db/database.ts
mobile/lib/local-db/schema.ts
mobile/lib/local-db/materializer.ts
mobile/lib/local-db/operations.ts
mobile/lib/local-db/queries/cabinets.ts
mobile/lib/local-db/queries/shelves.ts
mobile/lib/local-db/queries/items.ts
mobile/lib/local-db/queries/inventory.ts
mobile/lib/sync/engine.ts
mobile/lib/sync/compaction.ts
mobile/lib/sync/encryption.ts
mobile/lib/sync/manifest.ts
mobile/lib/sync/oplog-parser.ts
mobile/lib/sync/key-manager.ts
mobile/lib/sync/device-id.ts
mobile/lib/hooks/useSQLiteQuery.ts
mobile/lib/hooks/useLocalCabinets.ts
mobile/lib/hooks/useLocalShelves.ts
mobile/lib/hooks/useLocalItems.ts
mobile/lib/hooks/useLocalSearch.ts
mobile/lib/hooks/useLocalInventory.ts
mobile/lib/hooks/useSyncStatus.ts
mobile/lib/store/local-db-store.ts
mobile/lib/api/sync.ts
mobile/lib/api/key-shares.ts
```

### Modified Files — Frontend

```
mobile/app/(tabs)/locations/[locationId]/index.tsx          → use local hooks
mobile/app/(tabs)/locations/[locationId]/[cabinetId]/index.tsx → use local hooks
mobile/app/(tabs)/search/index.tsx                          → use local search
mobile/app/(tabs)/assistant.tsx                              → use local inventory
mobile/app/_layout.tsx                                       → init SQLite, start sync engine
mobile/lib/hooks/useItemIdentifier.ts                        → send existing items from SQLite
```

### Deprecated Files — Backend (remove after migration period)

```
src/app/api/cabinets/route.ts
src/app/api/cabinets/[cabinetId]/route.ts
src/app/api/cabinets/[cabinetId]/shelves/route.ts
src/app/api/cabinets/[cabinetId]/items/route.ts
src/app/api/shelves/route.ts
src/app/api/shelves/[id]/route.ts
src/app/api/shelves/[id]/items/route.ts
src/app/api/items/route.ts
src/app/api/items/[id]/route.ts
src/app/api/items/batch/route.ts
src/app/api/search/route.ts
src/app/api/inventory/full/route.ts
```

### Deprecated Files — Frontend (remove after migration)

```
mobile/lib/api/cabinets.ts
mobile/lib/api/items.ts
mobile/lib/api/inventory.ts
```
