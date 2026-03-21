import { apiClient } from "./client";
import type { FlatInventoryItem } from "@/types";

export const inventoryApi = {
  /**
   * Fetches the authenticated user's entire inventory as a flat list.
   * Intended for the AI chat feature — cache aggressively (5 min TTL).
   */
  getFull: () => apiClient.get<FlatInventoryItem[]>("/api/inventory/full"),
};
