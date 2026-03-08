import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import {
  handleRouteError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import { createCabinetSchema } from "@/lib/validations/cabinet";
import { HTTP_STATUS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const body = await request.json();
    const input = createCabinetSchema.parse(body);

    // Verify the user owns the target location
    const location = await prisma.location.findFirst({
      where: { id: input.locationId, deletedAt: null },
    });
    if (!location) throw new NotFoundError("Location");
    if (location.userId !== userId) throw new ForbiddenError();

    const cabinet = await prisma.cabinet.create({ data: input });

    return NextResponse.json({ data: cabinet }, { status: HTTP_STATUS.CREATED });
  } catch (error) {
    return handleRouteError(error, "POST /api/cabinets");
  }
}
