import type { ItemType } from "@/types";

// ── Op Envelope ──────────────────────────────────────────────────────────────

export type OpType =
  | "add_cabinet"
  | "update_cabinet"
  | "delete_cabinet"
  | "add_shelf"
  | "update_shelf"
  | "delete_shelf"
  | "add_item"
  | "update_item"
  | "delete_item"
  | "batch_add_items"
  | "move_item";

export interface Operation {
  id: string;
  seq: number;
  timestamp: string;
  userId: string;
  deviceId: string;
  locationId: string;
  type: OpType;
  payload: OpPayload;
}

// ── Payloads ─────────────────────────────────────────────────────────────────

export interface AddCabinetPayload {
  cabinetId: string;
  name: string;
  description: string | null;
  imagePath: string | null;
  signedImageUrl: string | null;
}

export interface UpdateCabinetPayload {
  cabinetId: string;
  changes: Partial<{
    name: string;
    description: string | null;
    imagePath: string | null;
    signedImageUrl: string | null;
  }>;
}

export interface DeleteCabinetPayload {
  cabinetId: string;
  cascadedShelfIds: string[];
  cascadedItemIds: string[];
}

export interface AddShelfPayload {
  shelfId: string;
  cabinetId: string;
  name: string;
  position: number;
  imagePath: string | null;
  signedImageUrl: string | null;
}

export interface UpdateShelfPayload {
  shelfId: string;
  changes: Partial<{
    name: string;
    position: number;
    imagePath: string | null;
    signedImageUrl: string | null;
  }>;
}

export interface DeleteShelfPayload {
  shelfId: string;
  orphanedItemIds: string[];
}

export interface AddItemPayload {
  itemId: string;
  cabinetId: string;
  shelfId: string | null;
  name: string;
  description: string | null;
  quantity: number;
  itemType: ItemType;
  imagePath: string | null;
  signedImageUrl: string | null;
  tags: string[];
}

export interface UpdateItemPayload {
  itemId: string;
  changes: Partial<{
    name: string;
    description: string | null;
    quantity: number;
    itemType: ItemType;
    shelfId: string | null;
    imagePath: string | null;
    signedImageUrl: string | null;
    tags: string[];
  }>;
}

export interface DeleteItemPayload {
  itemId: string;
}

export interface BatchAddItemsPayload {
  cabinetId: string;
  shelfId: string | null;
  items: Array<{
    itemId: string;
    name: string;
    quantity: number;
    itemType: ItemType;
    description: string | null;
    tags: string[];
  }>;
}

export interface MoveItemPayload {
  itemId: string;
  fromCabinetId: string;
  fromShelfId: string | null;
  toCabinetId: string;
  toShelfId: string | null;
}

export type OpPayload =
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

// ── Sync Manifest ────────────────────────────────────────────────────────────

export interface SyncManifest {
  locationId: string;
  opCount: number;
  contentHash: string;
  lastModified: string;
  deviceSeqs: Record<string, number>;
  schemaVersion: number;
  compactedAt: string | null;
}

// ── Local DB rows ────────────────────────────────────────────────────────────

export interface LocalCabinetRow {
  id: string;
  location_id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  signed_image_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LocalShelfRow {
  id: string;
  cabinet_id: string;
  name: string;
  position: number;
  image_path: string | null;
  signed_image_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LocalItemRow {
  id: string;
  cabinet_id: string;
  shelf_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  item_type: string;
  image_path: string | null;
  signed_image_url: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
