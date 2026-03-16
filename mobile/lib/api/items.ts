import { apiClient } from "./client";
import type { Item, ItemWithLocation, ItemType } from "@/types";

export interface CreateItemPayload {
  cabinetId: string;
  shelfId?: string;
  name: string;
  description?: string;
  quantity?: number;
  imageUrl?: string;
  tags?: string[];
  itemType?: ItemType;
}

export const itemsApi = {
  get: (id: string) => apiClient.get<ItemWithLocation>(`/api/items/${id}`),

  create: (data: CreateItemPayload) => apiClient.post<Item>("/api/items", data),

  update: (id: string, data: Partial<CreateItemPayload>) =>
    apiClient.patch<Item>(`/api/items/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/items/${id}`),

  search: (q: string) =>
    apiClient.get<ItemWithLocation[]>(`/api/search?q=${encodeURIComponent(q)}`),
};
