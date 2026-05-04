import { prisma } from "@/lib/db/prisma";
import type { FlatInventoryItem, LocationStructure } from "@/lib/ai/system-prompt";

/**
 * Returns the full flat inventory for a user — both owned locations
 * and locations the user has been invited to (ACCEPTED).
 *
 * Shared between GET /api/inventory/full and voice fulfillment.
 */
export async function getUserInventory(userId: string): Promise<FlatInventoryItem[]> {
  const locations = await prisma.location.findMany({
    where: {
      deletedAt: null,
      OR: [
        { userId },
        { members: { some: { userId, status: "ACCEPTED" } } },
      ],
    },
    select: {
      id: true,
      name: true,
      type: true,
      cabinets: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          shelves: {
            where: { deletedAt: null },
            select: { id: true, name: true },
          },
          items: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              description: true,
              quantity: true,
              itemType: true,
              shelfId: true,
              tags: true,
            },
          },
        },
      },
    },
  });

  const flatItems: FlatInventoryItem[] = [];

  for (const location of locations) {
    for (const cabinet of location.cabinets) {
      const shelfMap = new Map(cabinet.shelves.map((s) => [s.id, s.name]));

      for (const item of cabinet.items) {
        flatItems.push({
          location: location.name,
          locationType: location.type,
          cabinet: cabinet.name,
          shelf: item.shelfId ? (shelfMap.get(item.shelfId) ?? null) : null,
          name: item.name,
          type: item.itemType,
          quantity: item.quantity,
          description: item.description,
          tags: item.tags,
          itemId: item.id,
          locationId: location.id,
          cabinetId: cabinet.id,
          shelfId: item.shelfId,
        });
      }
    }
  }

  return flatItems;
}

/**
 * Returns the full location → cabinet → shelf tree for a user.
 * Includes empty cabinets/shelves (no items required).
 *
 * Shared between GET /api/inventory/full and voice fulfillment.
 */
export async function getUserStructure(userId: string): Promise<LocationStructure[]> {
  const locations = await prisma.location.findMany({
    where: {
      deletedAt: null,
      OR: [
        { userId },
        { members: { some: { userId, status: "ACCEPTED" } } },
      ],
    },
    select: {
      id: true,
      name: true,
      type: true,
      cabinets: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          shelves: {
            where: { deletedAt: null },
            orderBy: { position: "asc" },
            select: {
              id: true,
              name: true,
              position: true,
            },
          },
        },
      },
    },
  });

  return locations.map((loc) => ({
    locationId: loc.id,
    locationName: loc.name,
    locationType: loc.type,
    cabinets: loc.cabinets.map((cab) => ({
      cabinetId: cab.id,
      cabinetName: cab.name,
      description: cab.description,
      shelves: cab.shelves.map((shelf) => ({
        shelfId: shelf.id,
        shelfName: shelf.name,
        position: shelf.position,
      })),
    })),
  }));
}
