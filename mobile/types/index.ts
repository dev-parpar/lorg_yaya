// ── Domain types (mirrors the web app's Prisma output) ───────────────────────

export type LocationType = "HOME" | "OFFICE";

export type ItemType =
  | "FOOD"
  | "GAME"
  | "SPORTS"
  | "ELECTRONICS"
  | "UTENSILS"
  | "CUTLERY"
  | "FIRST_AID"
  | "CLOTHES"
  | "ACCESSORIES"
  | "SHOES"
  | "OTHER";

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  FOOD: "Food",
  GAME: "Game",
  SPORTS: "Sports",
  ELECTRONICS: "Electronics",
  UTENSILS: "Utensils",
  CUTLERY: "Cutlery",
  FIRST_AID: "First Aid",
  CLOTHES: "Clothes",
  ACCESSORIES: "Accessories",
  SHOES: "Shoes",
  OTHER: "Other",
};

export const ALL_ITEM_TYPES = Object.keys(ITEM_TYPE_LABELS) as ItemType[];

export type LocationRole = "OWNER" | "EDITOR";
export type InviteStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED";

export interface Profile {
  id: string;
  userId: string;
  username: string;
  avatarPath: string | null;
  signedAvatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  userId: string;
  name: string;
  type: LocationType;
  address: string | null;
  imagePath: string | null;
  signedImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LocationWithCounts extends Location {
  _count: { cabinets: number };
  // Injected by GET /api/locations — caller's role on this location
  role: LocationRole;
}

export interface LocationMember {
  id: string;
  locationId: string;
  userId: string;
  invitedBy: string;
  role: "EDITOR";
  status: InviteStatus;
  invitedAt: string;
  respondedAt: string | null;
  username: string | null;
}

export interface Invite {
  id: string;
  locationId: string;
  userId: string;
  invitedBy: string;
  invitedByUsername: string | null;
  role: "EDITOR";
  status: InviteStatus;
  invitedAt: string;
  respondedAt: string | null;
  location: {
    id: string;
    name: string;
    type: LocationType;
    address: string | null;
    signedImageUrl: string | null;
  };
}

export interface Cabinet {
  id: string;
  locationId: string;
  name: string;
  description: string | null;
  imagePath: string | null;
  signedImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CabinetWithCounts extends Cabinet {
  _count: { shelves: number; items: number };
}

export interface Shelf {
  id: string;
  cabinetId: string;
  name: string;
  position: number;
  imagePath: string | null;
  signedImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ShelfWithCounts extends Shelf {
  _count: { items: number };
}

export interface Item {
  id: string;
  cabinetId: string;
  shelfId: string | null;
  name: string;
  description: string | null;
  quantity: number;
  itemType: ItemType;
  imagePath: string | null;
  signedImageUrl: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  shelf?: Shelf | null;
}

export interface ItemWithLocation extends Item {
  cabinet: Cabinet & { location: Location };
}

export interface BatchItemRow {
  name: string;
  quantity: number;
  itemType: ItemType;
}

// ── AI / Vision ──────────────────────────────────────────────────────────────

/**
 * One item returned by POST /api/ai/identify-items after the vision + dedup passes.
 * The mobile review screen works entirely with this type.
 */
export interface DetectedItem {
  /** Local-only stable key for list rendering — never sent to the API */
  _key: string;
  name: string;
  type: ItemType;
  /** Claude's confidence score 0–1 */
  confidence: number;
  /** How many to add / increment (default 1) */
  quantity: number;
  /** True when this item semantically matches an item already in the cabinet */
  isDuplicate: boolean;
  /** ID of the existing item to increment (only set when isDuplicate = true) */
  existingItemId: string | null;
  /** Current qty of the existing item (only set when isDuplicate = true) */
  existingQty: number | null;
  /** User chose to skip this item entirely */
  skipped: boolean;
  /**
   * When isDuplicate = true and the user wants to bump the qty instead of
   * creating a second entry, set this to true. Default true for duplicates.
   */
  incrementInstead: boolean;
}

// ── AI / Chat ────────────────────────────────────────────────────────────────

/** Mirrors FlatInventoryItem from src/lib/ai/system-prompt.ts */
export interface FlatInventoryItem {
  location: string;
  locationType: string;
  cabinet: string;
  shelf: string | null;
  name: string;
  type: string;
  quantity: number;
  description: string | null;
  tags: string[];
  /** IDs for AI action resolution */
  itemId: string;
  locationId: string;
  cabinetId: string;
  shelfId: string | null;
}

/** Full location → cabinet → shelf structure (including empty ones) for AI context */
export interface LocationStructure {
  locationId: string;
  locationName: string;
  locationType: string;
  cabinets: Array<{
    cabinetId: string;
    cabinetName: string;
    description: string | null;
    shelves: Array<{
      shelfId: string;
      shelfName: string;
      position: number;
    }>;
  }>;
}

// ── AI Inventory Actions ────────────────────────────────────────────────────

export type InventoryAction =
  | {
      type: "add_item";
      locationId: string;
      cabinetId: string;
      shelfId: string | null;
      item: {
        name: string;
        quantity: number;
        itemType: ItemType;
        description: string | null;
        tags: string[];
      };
    }
  | {
      type: "update_item";
      itemId: string;
      locationId: string;
      changes: {
        name?: string;
        quantity?: number;
        itemType?: ItemType;
        description?: string | null;
        tags?: string[];
      };
    }
  | {
      type: "remove_item";
      itemId: string;
      locationId: string;
    }
  | {
      type: "move_item";
      itemId: string;
      locationId: string;
      toCabinetId: string;
      toShelfId: string | null;
    }
  | {
      type: "add_cabinet";
      locationId: string;
      cabinet: { name: string; description: string | null };
    }
  | {
      type: "update_cabinet";
      cabinetId: string;
      locationId: string;
      changes: { name?: string; description?: string | null };
    }
  | {
      type: "remove_cabinet";
      cabinetId: string;
      locationId: string;
    }
  | {
      type: "add_shelf";
      cabinetId: string;
      locationId: string;
      shelf: { name: string };
    }
  | {
      type: "update_shelf";
      shelfId: string;
      locationId: string;
      changes: { name?: string };
    }
  | {
      type: "remove_shelf";
      shelfId: string;
      locationId: string;
    };

export interface ActionResponse {
  text: string;
  actions: InventoryAction[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** True while the assistant response is still streaming in */
  isStreaming?: boolean;
  /** Structured actions returned by Claude (only on assistant messages) */
  actions?: InventoryAction[];
  /** Lifecycle of the action card */
  actionStatus?: "pending" | "confirmed" | "rejected";
}

// ── API response envelope ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  meta?: { total?: number; page?: number; pageSize?: number; q?: string };
}

export interface ApiError {
  error: string;
  details?: unknown;
}
