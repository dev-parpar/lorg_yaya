// ── Domain types (mirrors the web app's Prisma output) ───────────────────────

export type LocationType = "HOME" | "OFFICE";

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
