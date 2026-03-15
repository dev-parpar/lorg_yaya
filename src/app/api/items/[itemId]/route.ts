import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError, NotFoundError } from "@/lib/errors";
import { updateItemSchema } from "@/lib/validations/item";
import { getAccessibleItem } from "@/lib/db/access";

type Params = { params: Promise<{ itemId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { itemId } = await params;
    const item = await getAccessibleItem(itemId, userId);

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
    const existing = await getAccessibleItem(itemId, userId);

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
    await getAccessibleItem(itemId, userId);

    await prisma.item.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/items/[itemId]");
  }
}
