import { useCallback } from "react";
import * as Crypto from "expo-crypto";
import { getDatabase } from "@/lib/local-db/database";
import { getShelves } from "@/lib/local-db/queries/shelves";
import { writeOp } from "@/lib/local-db/operations";
import { useSQLiteQuery } from "./useSQLiteQuery";
import { posthog } from "@/lib/analytics/posthog";
import type { ShelfWithCounts } from "@/types";
import type { AddShelfPayload, UpdateShelfPayload, DeleteShelfPayload } from "@/lib/local-db/types";

export function useLocalShelves(cabinetId: string, locationId: string) {
  const db = getDatabase();

  const { data: shelves, isLoading } = useSQLiteQuery<ShelfWithCounts[]>(
    ["shelves"],
    () => getShelves(db, cabinetId),
    [cabinetId],
  );

  const create = useCallback(
    async (name: string, position?: number) => {
      // Default position: after the last shelf
      const lastPos = shelves?.length
        ? Math.max(...shelves.map((s) => s.position))
        : -1;
      const payload: AddShelfPayload = {
        shelfId: Crypto.randomUUID(),
        cabinetId,
        name,
        position: position ?? lastPos + 1,
        imagePath: null,
        signedImageUrl: null,
      };
      await writeOp("add_shelf", payload, locationId);
      posthog?.capture("shelf_created", { locationId });
    },
    [cabinetId, locationId, shelves],
  );

  const update = useCallback(
    async (shelfId: string, changes: UpdateShelfPayload["changes"]) => {
      const payload: UpdateShelfPayload = { shelfId, changes };
      await writeOp("update_shelf", payload, locationId);
    },
    [locationId],
  );

  const remove = useCallback(
    async (shelfId: string) => {
      // Gather items on this shelf — they'll be orphaned to the cabinet
      const items = db.getAllSync<{ id: string }>(
        `SELECT id FROM items WHERE shelf_id = ? AND deleted_at IS NULL`,
        [shelfId],
      );
      const payload: DeleteShelfPayload = {
        shelfId,
        orphanedItemIds: items.map((i) => i.id),
      };
      await writeOp("delete_shelf", payload, locationId);
    },
    [locationId, db],
  );

  return { shelves: shelves ?? [], isLoading, create, update, remove };
}
