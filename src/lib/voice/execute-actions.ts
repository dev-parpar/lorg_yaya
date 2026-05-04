import { prisma } from "@/lib/db/prisma";
import {
  getAccessibleCabinet,
  getAccessibleItem,
  getAccessibleShelf,
  assertLocationAccess,
  assertCabinetAccess,
} from "@/lib/db/access";
import { logger } from "@/lib/logger";
import type { ItemType } from "@prisma/client";

/** Shape of a single action from Claude's manage_inventory tool_use. */
export interface VoiceAction {
  type: string;
  locationId: string;
  cabinetId?: string;
  shelfId?: string | null;
  itemId?: string;
  item?: {
    name: string;
    quantity?: number;
    itemType?: string;
    description?: string | null;
    tags?: string[];
  };
  changes?: {
    name?: string;
    quantity?: number;
    itemType?: string;
    description?: string | null;
    tags?: string[];
  };
  toCabinetId?: string;
  toShelfId?: string | null;
  cabinet?: { name: string; description?: string | null };
  shelf?: { name: string };
}

export interface ExecutionResult {
  succeeded: number;
  failed: number;
  summary: string;
}

/**
 * Executes a batch of inventory mutations from a Claude tool_use response.
 * Each action is independently authorized and executed — a single failure
 * does not block the remaining actions.
 */
export async function executeVoiceActions(
  userId: string,
  actions: VoiceAction[],
): Promise<ExecutionResult> {
  let succeeded = 0;
  let failed = 0;
  const results: string[] = [];

  for (const action of actions) {
    try {
      const msg = await executeSingle(userId, action);
      succeeded++;
      results.push(msg);
    } catch (err) {
      failed++;
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error("[voice/execute] Action failed", {
        type: action.type,
        error: errMsg,
      });
      results.push(`Failed to ${action.type}: ${errMsg}`);
    }
  }

  return {
    succeeded,
    failed,
    summary: results.join(". "),
  };
}

async function executeSingle(userId: string, action: VoiceAction): Promise<string> {
  switch (action.type) {
    case "add_item":
      return addItem(userId, action);
    case "update_item":
      return updateItem(userId, action);
    case "remove_item":
      return removeItem(userId, action);
    case "move_item":
      return moveItem(userId, action);
    case "add_cabinet":
      return addCabinet(userId, action);
    case "update_cabinet":
      return updateCabinet(userId, action);
    case "remove_cabinet":
      return removeCabinet(userId, action);
    case "add_shelf":
      return addShelf(userId, action);
    case "update_shelf":
      return updateShelf(userId, action);
    case "remove_shelf":
      return removeShelf(userId, action);
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

// ── Item actions ────────────────────────────────────────────────────────────

async function addItem(userId: string, action: VoiceAction): Promise<string> {
  if (!action.cabinetId) throw new Error("cabinetId is required for add_item");
  if (!action.item?.name) throw new Error("item.name is required for add_item");

  await assertCabinetAccess(action.cabinetId, userId);

  const created = await prisma.item.create({
    data: {
      cabinetId: action.cabinetId,
      shelfId: action.shelfId ?? null,
      name: action.item.name,
      quantity: action.item.quantity ?? 1,
      itemType: (action.item.itemType as ItemType) ?? "OTHER",
      description: action.item.description ?? null,
      tags: action.item.tags ?? [],
    },
  });

  logger.info("[voice/execute] Item added", { itemId: created.id, name: created.name });
  return `Added "${created.name}" (qty: ${created.quantity})`;
}

async function updateItem(userId: string, action: VoiceAction): Promise<string> {
  if (!action.itemId) throw new Error("itemId is required for update_item");

  const item = await getAccessibleItem(action.itemId, userId);

  const data: Record<string, unknown> = {};
  if (action.changes?.name !== undefined) data.name = action.changes.name;
  if (action.changes?.quantity !== undefined) data.quantity = action.changes.quantity;
  if (action.changes?.itemType !== undefined) data.itemType = action.changes.itemType;
  if (action.changes?.description !== undefined) data.description = action.changes.description;
  if (action.changes?.tags !== undefined) data.tags = action.changes.tags;

  await prisma.item.update({ where: { id: item.id }, data });

  return `Updated "${item.name}"`;
}

async function removeItem(userId: string, action: VoiceAction): Promise<string> {
  if (!action.itemId) throw new Error("itemId is required for remove_item");

  const item = await getAccessibleItem(action.itemId, userId);

  await prisma.item.update({
    where: { id: item.id },
    data: { deletedAt: new Date() },
  });

  return `Removed "${item.name}"`;
}

async function moveItem(userId: string, action: VoiceAction): Promise<string> {
  if (!action.itemId) throw new Error("itemId is required for move_item");
  if (!action.toCabinetId) throw new Error("toCabinetId is required for move_item");

  const item = await getAccessibleItem(action.itemId, userId);
  await assertCabinetAccess(action.toCabinetId, userId);

  await prisma.item.update({
    where: { id: item.id },
    data: {
      cabinetId: action.toCabinetId,
      shelfId: action.toShelfId ?? null,
    },
  });

  return `Moved "${item.name}" to new location`;
}

// ── Cabinet actions ─────────────────────────────────────────────────────────

async function addCabinet(userId: string, action: VoiceAction): Promise<string> {
  if (!action.locationId) throw new Error("locationId is required for add_cabinet");
  if (!action.cabinet?.name) throw new Error("cabinet.name is required for add_cabinet");

  await assertLocationAccess(action.locationId, userId);

  const created = await prisma.cabinet.create({
    data: {
      locationId: action.locationId,
      name: action.cabinet.name,
      description: action.cabinet.description ?? null,
    },
  });

  logger.info("[voice/execute] Cabinet added", { cabinetId: created.id, name: created.name });
  return `Created cabinet "${created.name}"`;
}

async function updateCabinet(userId: string, action: VoiceAction): Promise<string> {
  if (!action.cabinetId) throw new Error("cabinetId is required for update_cabinet");

  const cabinet = await getAccessibleCabinet(action.cabinetId, userId);

  const data: Record<string, unknown> = {};
  if (action.changes?.name !== undefined) data.name = action.changes.name;
  if ((action.changes as Record<string, unknown>)?.description !== undefined) {
    data.description = (action.changes as Record<string, unknown>).description;
  }

  await prisma.cabinet.update({ where: { id: cabinet.id }, data });

  return `Updated cabinet "${cabinet.name}"`;
}

async function removeCabinet(userId: string, action: VoiceAction): Promise<string> {
  if (!action.cabinetId) throw new Error("cabinetId is required for remove_cabinet");

  const cabinet = await getAccessibleCabinet(action.cabinetId, userId);
  const now = new Date();

  // Cascade soft-delete: cabinet → shelves → items
  await prisma.$transaction([
    prisma.item.updateMany({
      where: { cabinetId: cabinet.id, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.shelf.updateMany({
      where: { cabinetId: cabinet.id, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.cabinet.update({
      where: { id: cabinet.id },
      data: { deletedAt: now },
    }),
  ]);

  logger.info("[voice/execute] Cabinet cascade-deleted", { cabinetId: cabinet.id });
  return `Deleted cabinet "${cabinet.name}" and all its contents`;
}

// ── Shelf actions ───────────────────────────────────────────────────────────

async function addShelf(userId: string, action: VoiceAction): Promise<string> {
  if (!action.cabinetId) throw new Error("cabinetId is required for add_shelf");
  if (!action.shelf?.name) throw new Error("shelf.name is required for add_shelf");

  await assertCabinetAccess(action.cabinetId, userId);

  // Determine position — append after the last shelf
  const lastShelf = await prisma.shelf.findFirst({
    where: { cabinetId: action.cabinetId, deletedAt: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const created = await prisma.shelf.create({
    data: {
      cabinetId: action.cabinetId,
      name: action.shelf.name,
      position: (lastShelf?.position ?? -1) + 1,
    },
  });

  logger.info("[voice/execute] Shelf added", { shelfId: created.id, name: created.name });
  return `Created shelf "${created.name}"`;
}

async function updateShelf(userId: string, action: VoiceAction): Promise<string> {
  if (!action.shelfId) throw new Error("shelfId is required for update_shelf");

  const shelf = await getAccessibleShelf(action.shelfId, userId);

  const data: Record<string, unknown> = {};
  if (action.changes?.name !== undefined) data.name = action.changes.name;

  await prisma.shelf.update({ where: { id: shelf.id }, data });

  return `Updated shelf "${shelf.name}"`;
}

async function removeShelf(userId: string, action: VoiceAction): Promise<string> {
  if (!action.shelfId) throw new Error("shelfId is required for remove_shelf");

  const shelf = await getAccessibleShelf(action.shelfId, userId);

  // Orphan items on this shelf back to the cabinet root
  await prisma.item.updateMany({
    where: { shelfId: shelf.id, deletedAt: null },
    data: { shelfId: null },
  });

  await prisma.shelf.update({
    where: { id: shelf.id },
    data: { deletedAt: new Date() },
  });

  logger.info("[voice/execute] Shelf deleted", { shelfId: shelf.id });
  return `Deleted shelf "${shelf.name}"`;
}
