import { apiClient } from "./client";
import type { Location, LocationWithCounts } from "@/types";

export const locationsApi = {
  list: () => apiClient.get<LocationWithCounts[]>("/api/locations"),

  get: (id: string) => apiClient.get<Location>(`/api/locations/${id}`),

  create: (data: { name: string; type: string; address?: string }) =>
    apiClient.post<Location>("/api/locations", data),

  update: (id: string, data: Partial<{ name: string; type: string; address: string }>) =>
    apiClient.patch<Location>(`/api/locations/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/locations/${id}`),

  getCabinets: (locationId: string) =>
    apiClient.get<import("@/types").CabinetWithCounts[]>(
      `/api/locations/${locationId}/cabinets`,
    ),
};
