import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import {
  handleRouteError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import { updateItemSchema } from "@/lib/validations/item";

type Params = { params: Promise<{ itemId: string }> };

async function getOwnedItem(itemId: string, userId: string) {
  const item = await prisma.item.findFirst({
    where: { id: itemId, deletedAt: null },
    include: { cabinet: { include: { location: true } }, shelf: true },
  });
  if (!item) throw new NotFoundError("Item");
  if (item.cabinet.location.userId !== userId) throw new ForbiddenError();
  return item;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { itemId } = await params;
    const item = await getOwnedItem(itemId, userId);

    return NextResponse.json({ data: item });
  } catch (error) {
    return handleRouteError(error, "GET /api/items/[itemId]");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { itemId } = await params;
    const existing = await getOwnedItem(itemId, userId);

    const body = await request.json();
    const input = updateItemSchema.parse(body);

    // If moving to a new shelf, verify it belongs to the same cabinet
    if (input.shelfId && input.shelfId !== existing.shelfId) {
      const shelf = await prisma.shelf.findFirst({
        where: {
          id: input.shelfId,
          cabinetId: existing.cabinetId,
          deletedAt: null,
        },
      });
      if (!shelf) throw new NotFoundError("Shelf");
    }

    const updated = await prisma.item.update({
      where: { id: itemId },
      data: input,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/items/[itemId]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { itemId } = await params;
    await getOwnedItem(itemId, userId);

    await prisma.item.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/items/[itemId]");
  }
}
