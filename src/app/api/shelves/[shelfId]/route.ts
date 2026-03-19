import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { updateShelfSchema } from "@/lib/validations/shelf";
import { getAccessibleShelf } from "@/lib/db/access";
import { generateSignedUrl } from "@/lib/storage/sign";

type Params = { params: Promise<{ shelfId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { shelfId } = await params;
    const shelf = await getAccessibleShelf(shelfId, userId);

    return NextResponse.json({ data: shelf });
  } catch (error) {
    return handleRouteError(error, "GET /api/shelves/[shelfId]");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { shelfId } = await params;
    const existing = await getAccessibleShelf(shelfId, userId);

    const body = await request.json();
    const { imagePath, ...rest } = updateShelfSchema.parse(body);

    let imageUpdate: { imagePath?: string | null; signedImageUrl?: string | null } = {};

    if (imagePath === null) {
      imageUpdate = { imagePath: null, signedImageUrl: null };
    } else if (imagePath !== undefined) {
      const signedImageUrl = await generateSignedUrl("shelves", imagePath);
      imageUpdate = { imagePath, signedImageUrl };
    }

    const updated = await prisma.shelf.update({
      where: { id: shelfId },
      data: { ...rest, ...imageUpdate },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/shelves/[shelfId]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { shelfId } = await params;
    await getAccessibleShelf(shelfId, userId);

    await prisma.shelf.update({
      where: { id: shelfId },
      data: { deletedAt: new Date() },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/shelves/[shelfId]");
  }
}
