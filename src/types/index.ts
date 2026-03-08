import type { Location, Cabinet, Shelf, Item, LocationType } from "@prisma/client";

export type { LocationType };

// ── Enriched types returned by API ──────────────────────────────────────────

export type LocationWithCounts = Location & {
  _count: { cabinets: number };
};

export type CabinetWithCounts = Cabinet & {
  _count: { shelves: number; items: number };
};

export type ShelfWithCounts = Shelf & {
  _count: { items: number };
};

export type ItemWithLocation = Item & {
  cabinet: Cabinet & { location: Location };
  shelf: Shelf | null;
};

// ── API response envelope ────────────────────────────────────────────────────

export type ApiSuccess<T> = {
  data: T;
  meta?: { total?: number; page?: number; pageSize?: number };
};

export type ApiError = {
  error: string;
  details?: unknown;
};

export type PaginationParams = {
  page: number;
  pageSize: number;
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
