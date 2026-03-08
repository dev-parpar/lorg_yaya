import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import {
  handleRouteError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import { updateShelfSchema } from "@/lib/validations/shelf";

type Params = { params: Promise<{ shelfId: string }> };

async function getOwnedShelf(shelfId: string, userId: string) {
  const shelf = await prisma.shelf.findFirst({
    where: { id: shelfId, deletedAt: null },
    include: { cabinet: { include: { location: true } } },
  });
  if (!shelf) throw new NotFoundError("Shelf");
  if (shelf.cabinet.location.userId !== userId) throw new ForbiddenError();
  return shelf;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { shelfId } = await params;
    const shelf = await getOwnedShelf(shelfId, userId);

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
    await getOwnedShelf(shelfId, userId);

    const body = await request.json();
    const input = updateShelfSchema.parse(body);

    const updated = await prisma.shelf.update({
      where: { id: shelfId },
      data: input,
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
    await getOwnedShelf(shelfId, userId);

    await prisma.shelf.update({
      where: { id: shelfId },
      data: { deletedAt: new Date() },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/shelves/[shelfId]");
  }
}
