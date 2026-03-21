import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError, NotFoundError } from "@/lib/errors";
import { updateItemSchema } from "@/lib/validations/item";
import { getAccessibleItem } from "@/lib/db/access";
import { generateSignedUrl } from "@/lib/storage/sign";

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
    const { imagePath, ...rest } = updateItemSchema.parse(body);

    // Validate shelf ownership if moving to a new shelf
    if (rest.shelfId && rest.shelfId !== existing.shelfId) {
      const shelf = await prisma.shelf.findFirst({
        where: { id: rest.shelfId, cabinetId: existing.cabinetId, deletedAt: null },
      });
      if (!shelf) throw new NotFoundError("Shelf");
    }

    let imageUpdate: { imagePath?: string | null; signedImageUrl?: string | null } = {};

    if (imagePath === null) {
      imageUpdate = { imagePath: null, signedImageUrl: null };
    } else if (imagePath !== undefined) {
      const signedImageUrl = await generateSignedUrl("items", imagePath);
      imageUpdate = { imagePath, signedImageUrl };
    }

    const updated = await prisma.item.update({
      where: { id: itemId },
      data: { ...rest, ...imageUpdate },
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
