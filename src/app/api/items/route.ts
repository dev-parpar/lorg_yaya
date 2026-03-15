import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError, NotFoundError } from "@/lib/errors";
import { createItemSchema } from "@/lib/validations/item";
import { HTTP_STATUS } from "@/lib/constants";
import { assertCabinetAccess } from "@/lib/db/access";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const body = await request.json();
    const input = createItemSchema.parse(body);

    // Verify access (owner or accepted member)
    const cabinet = await assertCabinetAccess(input.cabinetId, userId);

    // If a shelfId is provided, verify it belongs to this cabinet
    if (input.shelfId) {
      const shelf = await prisma.shelf.findFirst({
        where: { id: input.shelfId, cabinetId: input.cabinetId, deletedAt: null },
      });
      if (!shelf) throw new NotFoundError("Shelf");
    }

    const item = await prisma.item.create({ data: input });

    return NextResponse.json({ data: item }, { status: HTTP_STATUS.CREATED });
  } catch (error) {
    return handleRouteError(error, "POST /api/items");
  }
}
