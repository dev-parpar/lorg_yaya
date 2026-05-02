import * as Crypto from "expo-crypto";
import { getDatabase } from "@/lib/local-db/database";
import { writeOp } from "@/lib/local-db/operations";
import type { InventoryAction, ItemType } from "@/types";

interface ActionResult {
  action: InventoryAction;
  success: boolean;
  error?: string;
}

/**
 * Execute a list of inventory actions returned by the AI.
 * Each action maps to a writeOp() call against local SQLite.
 * Actions are executed independently — a failure in one doesn't block others.
 */
export async function executeInventoryActions(
  actions: InventoryAction[],
): Promise<ActionResult[]> {
  const db = getDatabase();
  const results: ActionResult[] = [];

  for (const action of actions) {
    try {
      switch (action.type) {
        case "add_item": {
          const cab = db.getFirstSync<{ id: string }>(
            `SELECT id FROM cabinets WHERE id = ? AND deleted_at IS NULL`,
            [action.cabinetId],
          );
          if (!cab) {
            results.push({ action, success: false, error: "Cabinet not found" });
            break;
          }

          if (action.shelfId) {
            const shelf = db.getFirstSync<{ id: string }>(
              `SELECT id FROM shelves WHERE id = ? AND deleted_at IS NULL`,
              [action.shelfId],
            );
            if (!shelf) {
              results.push({ action, success: false, error: "Shelf not found" });
              break;
            }
          }

          await writeOp(
            "add_item",
            {
              itemId: Crypto.randomUUID(),
              cabinetId: action.cabinetId,
              shelfId: action.shelfId,
              name: action.item.name,
              description: action.item.description ?? null,
              quantity: action.item.quantity,
              itemType: action.item.itemType as ItemType,
              imagePath: null,
              signedImageUrl: null,
              tags: action.item.tags ?? [],
            },
            action.locationId,
          );
          results.push({ action, success: true });
          break;
        }

        case "update_item": {
          const item = db.getFirstSync<{ id: string }>(
            `SELECT id FROM items WHERE id = ? AND deleted_at IS NULL`,
            [action.itemId],
          );
          if (!item) {
            results.push({ action, success: false, error: "Item not found" });
            break;
          }

          await writeOp(
            "update_item",
            { itemId: action.itemId, changes: action.changes },
            action.locationId,
          );
          results.push({ action, success: true });
          break;
        }

        case "remove_item": {
          const itemToRemove = db.getFirstSync<{ id: string }>(
            `SELECT id FROM items WHERE id = ? AND deleted_at IS NULL`,
            [action.itemId],
          );
          if (!itemToRemove) {
            results.push({ action, success: false, error: "Item not found" });
            break;
          }

          await writeOp(
            "delete_item",
            { itemId: action.itemId },
            action.locationId,
          );
          results.push({ action, success: true });
          break;
        }

        case "move_item": {
          const itemToMove = db.getFirstSync<{
            id: string;
            cabinet_id: string;
            shelf_id: string | null;
          }>(
            `SELECT id, cabinet_id, shelf_id FROM items WHERE id = ? AND deleted_at IS NULL`,
            [action.itemId],
          );
          if (!itemToMove) {
            results.push({ action, success: false, error: "Item not found" });
            break;
          }

          await writeOp(
            "move_item",
            {
              itemId: action.itemId,
              fromCabinetId: itemToMove.cabinet_id,
              fromShelfId: itemToMove.shelf_id,
              toCabinetId: action.toCabinetId,
              toShelfId: action.toShelfId,
            },
            action.locationId,
          );
          results.push({ action, success: true });
          break;
        }

        case "add_cabinet": {
          await writeOp(
            "add_cabinet",
            {
              cabinetId: Crypto.randomUUID(),
              name: action.cabinet.name,
              description: action.cabinet.description ?? null,
              imagePath: null,
              signedImageUrl: null,
            },
            action.locationId,
          );
          results.push({ action, success: true });
          break;
        }

        case "update_cabinet": {
          const cabToUpdate = db.getFirstSync<{ id: string }>(
            `SELECT id FROM cabinets WHERE id = ? AND deleted_at IS NULL`,
            [action.cabinetId],
          );
          if (!cabToUpdate) {
            results.push({ action, success: false, error: "Cabinet not found" });
            break;
          }

          await writeOp(
            "update_cabinet",
            { cabinetId: action.cabinetId, changes: action.changes },
            action.locationId,
          );
          results.push({ action, success: true });
          break;
        }

        case "remove_cabinet": {
          const cabToRemove = db.getFirstSync<{ id: string }>(
            `SELECT id FROM cabinets WHERE id = ? AND deleted_at IS NULL`,
            [action.cabinetId],
          );
          if (!cabToRemove) {
            results.push({ action, success: false, error: "Cabinet not found" });
            break;
          }

          // Gather cascade IDs
          const shelves = db.getAllSync<{ id: string }>(
            `SELECT id FROM shelves WHERE cabinet_id = ? AND deleted_at IS NULL`,
            [action.cabinetId],
          );
          const items = db.getAllSync<{ id: string }>(
            `SELECT id FROM items WHERE cabinet_id = ? AND deleted_at IS NULL`,
            [action.cabinetId],
          );

          await writeOp(
            "delete_cabinet",
            {
              cabinetId: action.cabinetId,
              cascadedShelfIds: shelves.map((s) => s.id),
              cascadedItemIds: items.map((i) => i.id),
            },
            action.locationId,
          );
          results.push({ action, success: true });
          break;
        }

        case "add_shelf": {
          const cabForShelf = db.getFirstSync<{ id: string }>(
            `SELECT id FROM cabinets WHERE id = ? AND deleted_at IS NULL`,
            [action.cabinetId],
          );
          if (!cabForShelf) {
            results.push({ action, success: false, error: "Cabinet not found" });
            break;
          }

          // Determine next position
          const maxPos = db.getFirstSync<{ max_pos: number | null }>(
            `SELECT MAX(position) AS max_pos FROM shelves WHERE cabinet_id = ? AND deleted_at IS NULL`,
            [action.cabinetId],
          );
          const nextPosition = (maxPos?.max_pos ?? -1) + 1;

          await writeOp(
            "add_shelf",
            {
              shelfId: Crypto.randomUUID(),
              cabinetId: action.cabinetId,
              name: action.shelf.name,
              position: nextPosition,
              imagePath: null,
              signedImageUrl: null,
            },
            action.locationId,
          );
          results.push({ action, success: true });
          break;
        }

        case "update_shelf": {
          const shelfToUpdate = db.getFirstSync<{ id: string }>(
            `SELECT id FROM shelves WHERE id = ? AND deleted_at IS NULL`,
            [action.shelfId],
          );
          if (!shelfToUpdate) {
            results.push({ action, success: false, error: "Shelf not found" });
            break;
          }

          await writeOp(
            "update_shelf",
            { shelfId: action.shelfId, changes: action.changes },
            action.locationId,
          );
          results.push({ action, success: true });
          break;
        }

        case "remove_shelf": {
          const shelfToRemove = db.getFirstSync<{ id: string }>(
            `SELECT id FROM shelves WHERE id = ? AND deleted_at IS NULL`,
            [action.shelfId],
          );
          if (!shelfToRemove) {
            results.push({ action, success: false, error: "Shelf not found" });
            break;
          }

          // Gather orphaned item IDs (items on this shelf)
          const orphanedItems = db.getAllSync<{ id: string }>(
            `SELECT id FROM items WHERE shelf_id = ? AND deleted_at IS NULL`,
            [action.shelfId],
          );

          await writeOp(
            "delete_shelf",
            {
              shelfId: action.shelfId,
              orphanedItemIds: orphanedItems.map((i) => i.id),
            },
            action.locationId,
          );
          results.push({ action, success: true });
          break;
        }
      }
    } catch (err) {
      results.push({
        action,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}
