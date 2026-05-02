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
          // Validate cabinet exists
          const cab = db.getFirstSync<{ id: string }>(
            `SELECT id FROM cabinets WHERE id = ? AND deleted_at IS NULL`,
            [action.cabinetId],
          );
          if (!cab) {
            results.push({ action, success: false, error: "Cabinet not found" });
            break;
          }

          // Validate shelf exists if specified
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
          // Validate item exists
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
            {
              itemId: action.itemId,
              changes: action.changes,
            },
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
