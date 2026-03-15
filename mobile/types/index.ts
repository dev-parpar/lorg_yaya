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

export interface Location {
  id: string;
  userId: string;
  name: string;
  type: LocationType;
  address: string | null;
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
  };
}

export interface Cabinet {
  id: string;
  locationId: string;
  name: string;
  description: string | null;
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
  imageUrl: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  shelf?: Shelf | null;
}

export interface ItemWithLocation extends Item {
  cabinet: Cabinet & { location: Location };
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
