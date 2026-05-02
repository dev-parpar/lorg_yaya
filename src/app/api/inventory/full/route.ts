import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { prisma } from "@/lib/db/prisma";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import type { FlatInventoryItem } from "@/lib/ai/system-prompt";

/**
 * GET /api/inventory/full
 *
 * Returns the entire accessible inventory for the authenticated user as a flat
 * list suitable for inclusion in an AI system prompt. Covers both owned
 * locations and locations the user has been invited to (ACCEPTED status).
 *
 * This endpoint is intentionally lightweight — it selects only the fields
 * needed by the AI and performs a single DB round-trip via nested includes.
 */
export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

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

    return NextResponse.json({ data: flatItems });
  } catch (error) {
    return handleRouteError(error, "GET /api/inventory/full");
  }
}
