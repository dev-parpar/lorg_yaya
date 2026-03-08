import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import {
  handleRouteError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import { createShelfSchema } from "@/lib/validations/shelf";
import { HTTP_STATUS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const body = await request.json();
    const input = createShelfSchema.parse(body);

    const cabinet = await prisma.cabinet.findFirst({
      where: { id: input.cabinetId, deletedAt: null },
      include: { location: true },
    });
    if (!cabinet) throw new NotFoundError("Cabinet");
    if (cabinet.location.userId !== userId) throw new ForbiddenError();

    const shelf = await prisma.shelf.create({ data: input });

    return NextResponse.json({ data: shelf }, { status: HTTP_STATUS.CREATED });
  } catch (error) {
    return handleRouteError(error, "POST /api/shelves");
  }
}
