/**
 * SQLite schema for local-first inventory storage.
 * Mirrors the Prisma models for cabinets, shelves, and items
 * but lives entirely on-device.
 */

export const CREATE_TABLES_SQL = `
-- Tracks sync state per location
CREATE TABLE IF NOT EXISTS sync_meta (
  location_id  TEXT NOT NULL PRIMARY KEY,
  remote_hash  TEXT,
  last_synced_at TEXT
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
  payload     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pending_location ON pending_ops(location_id);

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
  deleted_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_cab_location ON cabinets(location_id);
CREATE INDEX IF NOT EXISTS idx_cab_deleted ON cabinets(deleted_at);

CREATE TABLE IF NOT EXISTS shelves (
  id               TEXT PRIMARY KEY,
  cabinet_id       TEXT NOT NULL,
  name             TEXT NOT NULL,
  position         INTEGER NOT NULL DEFAULT 0,
  image_path       TEXT,
  signed_image_url TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_shelf_cabinet ON shelves(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_shelf_deleted ON shelves(deleted_at);

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
  tags             TEXT NOT NULL DEFAULT '[]',
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_item_cabinet ON items(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_item_shelf ON items(shelf_id);
CREATE INDEX IF NOT EXISTS idx_item_deleted ON items(deleted_at);

-- FTS5 virtual table for full-text search (replaces PostgreSQL tsvector)
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  name,
  description,
  tags,
  content='items',
  content_rowid='rowid'
);

-- Triggers to keep FTS index in sync with items table
CREATE TRIGGER IF NOT EXISTS items_fts_insert AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, name, description, tags)
  VALUES (new.rowid, new.name, new.description, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS items_fts_delete AFTER DELETE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, name, description, tags)
  VALUES('delete', old.rowid, old.name, old.description, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS items_fts_update AFTER UPDATE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, name, description, tags)
  VALUES('delete', old.rowid, old.name, old.description, old.tags);
  INSERT INTO items_fts(rowid, name, description, tags)
  VALUES (new.rowid, new.name, new.description, new.tags);
END;
`;
