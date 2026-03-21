import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { createItemsBatchSchema } from "@/lib/validations/item";
import { assertCabinetAccess } from "@/lib/db/access";

/**
 * POST /api/items/batch
 *
 * Creates multiple items in a single cabinet in one database transaction.
 * The caller must have access to the cabinet (owner or accepted member).
 *
 * Request body:
 *   { cabinetId, shelfId?, items: [{ name, quantity, itemType }] }
 *
 * Response:
 *   { data: { count: number, items: Item[] } }
 *
 * Limits:
 *   - Max 50 items per batch (enforced by Zod schema)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const body = await request.json();
    const { cabinetId, shelfId, items } = createItemsBatchSchema.parse(body);

    // Verify access before touching any data
    await assertCabinetAccess(cabinetId, userId);

    // Validate that shelfId belongs to this cabinet (if provided)
    if (shelfId) {
      const shelf = await prisma.shelf.findFirst({
        where: { id: shelfId, cabinetId, deletedAt: null },
      });
      if (!shelf) {
        return NextResponse.json(
          { error: "Shelf does not belong to the specified cabinet." },
          { status: 400 },
        );
      }
    }

    // Build the rows to insert
    const now = new Date();
    const rows = items.map((item) => ({
      cabinetId,
      shelfId: shelfId ?? null,
      name: item.name,
      quantity: item.quantity,
      itemType: item.itemType,
      createdAt: now,
      updatedAt: now,
    }));

    // createMany is a single round-trip and runs inside an implicit transaction
    const result = await prisma.item.createMany({ data: rows });

    // Fetch the created items so we can return them with their IDs
    const created = await prisma.item.findMany({
      where: {
        cabinetId,
        shelfId: shelfId ?? null,
        deletedAt: null,
        createdAt: { gte: now },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      { data: { count: result.count, items: created } },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error, "POST /api/items/batch");
  }
}
