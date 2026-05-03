import { useCallback } from "react";
import * as Crypto from "expo-crypto";
import { getDatabase } from "@/lib/local-db/database";
import { getItems } from "@/lib/local-db/queries/items";
import { writeOp } from "@/lib/local-db/operations";
import { useSQLiteQuery } from "./useSQLiteQuery";
import { posthog } from "@/lib/analytics/posthog";
import type { Item, ItemType } from "@/types";
import type {
  AddItemPayload,
  UpdateItemPayload,
  DeleteItemPayload,
  BatchAddItemsPayload,
  MoveItemPayload,
} from "@/lib/local-db/types";

export function useLocalItems(
  cabinetId: string,
  locationId: string,
  shelfFilter?: string | null,
) {
  const db = getDatabase();

  const { data: items, isLoading } = useSQLiteQuery<Item[]>(
    ["items"],
    () => getItems(db, cabinetId, shelfFilter),
    [cabinetId, shelfFilter],
  );

  const create = useCallback(
    async (input: {
      name: string;
      description?: string | null;
      quantity?: number;
      itemType?: ItemType;
      shelfId?: string | null;
      tags?: string[];
    }) => {
      const payload: AddItemPayload = {
        itemId: Crypto.randomUUID(),
        cabinetId,
        shelfId: input.shelfId ?? null,
        name: input.name,
        description: input.description ?? null,
        quantity: input.quantity ?? 1,
        itemType: input.itemType ?? "OTHER",
        imagePath: null,
        signedImageUrl: null,
        tags: input.tags ?? [],
      };
      await writeOp("add_item", payload, locationId);
      posthog?.capture("item_added", { locationId, itemType: payload.itemType });
      return payload.itemId;
    },
    [cabinetId, locationId],
  );

  const batchCreate = useCallback(
    async (
      batchItems: Array<{
        name: string;
        quantity?: number;
        itemType?: ItemType;
        description?: string | null;
        tags?: string[];
      }>,
      shelfId?: string | null,
    ) => {
      const payload: BatchAddItemsPayload = {
        cabinetId,
        shelfId: shelfId ?? null,
        items: batchItems.map((item) => ({
          itemId: Crypto.randomUUID(),
          name: item.name,
          quantity: item.quantity ?? 1,
          itemType: item.itemType ?? "OTHER",
          description: item.description ?? null,
          tags: item.tags ?? [],
        })),
      };
      await writeOp("batch_add_items", payload, locationId);
      posthog?.capture("items_batch_added", { locationId, count: payload.items.length });
    },
    [cabinetId, locationId],
  );

  const update = useCallback(
    async (itemId: string, changes: UpdateItemPayload["changes"]) => {
      const payload: UpdateItemPayload = { itemId, changes };
      await writeOp("update_item", payload, locationId);
      posthog?.capture("item_updated", { locationId });
    },
    [locationId],
  );

  const remove = useCallback(
    async (itemId: string) => {
      const payload: DeleteItemPayload = { itemId };
      await writeOp("delete_item", payload, locationId);
      posthog?.capture("item_removed", { locationId });
    },
    [locationId],
  );

  const move = useCallback(
    async (
      itemId: string,
      from: { cabinetId: string; shelfId: string | null },
      to: { cabinetId: string; shelfId: string | null },
    ) => {
      const payload: MoveItemPayload = {
        itemId,
        fromCabinetId: from.cabinetId,
        fromShelfId: from.shelfId,
        toCabinetId: to.cabinetId,
        toShelfId: to.shelfId,
      };
      await writeOp("move_item", payload, locationId);
    },
    [locationId],
  );

  return {
    items: items ?? [],
    isLoading,
    create,
    batchCreate,
    update,
    remove,
    move,
  };
}
