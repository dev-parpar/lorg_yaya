import { useCallback } from "react";
import * as Crypto from "expo-crypto";
import { getDatabase } from "@/lib/local-db/database";
import { getCabinets } from "@/lib/local-db/queries/cabinets";
import { writeOp } from "@/lib/local-db/operations";
import { useSQLiteQuery } from "./useSQLiteQuery";
import { posthog } from "@/lib/analytics/posthog";
import type { CabinetWithCounts } from "@/types";
import type { AddCabinetPayload, UpdateCabinetPayload, DeleteCabinetPayload } from "@/lib/local-db/types";

export function useLocalCabinets(locationId: string) {
  const db = getDatabase();

  const { data: cabinets, isLoading } = useSQLiteQuery<CabinetWithCounts[]>(
    ["cabinets"],
    () => getCabinets(db, locationId),
    [locationId],
  );

  const create = useCallback(
    async (name: string, description?: string | null) => {
      const payload: AddCabinetPayload = {
        cabinetId: Crypto.randomUUID(),
        name,
        description: description ?? null,
        imagePath: null,
        signedImageUrl: null,
      };
      await writeOp("add_cabinet", payload, locationId);
      posthog?.capture("cabinet_created", { locationId });
    },
    [locationId],
  );

  const update = useCallback(
    async (cabinetId: string, changes: UpdateCabinetPayload["changes"]) => {
      const payload: UpdateCabinetPayload = { cabinetId, changes };
      await writeOp("update_cabinet", payload, locationId);
    },
    [locationId],
  );

  const remove = useCallback(
    async (cabinetId: string) => {
      // Gather cascade IDs from local SQLite
      const shelves = db.getAllSync<{ id: string }>(
        `SELECT id FROM shelves WHERE cabinet_id = ? AND deleted_at IS NULL`,
        [cabinetId],
      );
      const items = db.getAllSync<{ id: string }>(
        `SELECT id FROM items WHERE cabinet_id = ? AND deleted_at IS NULL`,
        [cabinetId],
      );
      const payload: DeleteCabinetPayload = {
        cabinetId,
        cascadedShelfIds: shelves.map((s) => s.id),
        cascadedItemIds: items.map((i) => i.id),
      };
      await writeOp("delete_cabinet", payload, locationId);
    },
    [locationId, db],
  );

  return { cabinets: cabinets ?? [], isLoading, create, update, remove };
}
