import { apiClient } from "./client";
import type { Cabinet, ShelfWithCounts, Item } from "@/types";

export const cabinetsApi = {
  get: (id: string) => apiClient.get<Cabinet>(`/api/cabinets/${id}`),

  create: (data: { locationId: string; name: string; description?: string }) =>
    apiClient.post<Cabinet>("/api/cabinets", data),

  update: (id: string, data: Partial<{ name: string; description: string }>) =>
    apiClient.patch<Cabinet>(`/api/cabinets/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/cabinets/${id}`),

  getShelves: (cabinetId: string) =>
    apiClient.get<ShelfWithCounts[]>(`/api/cabinets/${cabinetId}/shelves`),

  getItems: (cabinetId: string, shelfFilter?: string) => {
    const query = shelfFilter ? `?shelf=${shelfFilter}` : "";
    return apiClient.get<Item[]>(`/api/cabinets/${cabinetId}/items${query}`);
  },
};
