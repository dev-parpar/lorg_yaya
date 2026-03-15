import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { createCabinetSchema } from "@/lib/validations/cabinet";
import { HTTP_STATUS } from "@/lib/constants";
import { assertLocationAccess } from "@/lib/db/access";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const body = await request.json();
    const input = createCabinetSchema.parse(body);

    // Verify the user is the owner or an accepted member
    await assertLocationAccess(input.locationId, userId);

    const cabinet = await prisma.cabinet.create({ data: input });

    return NextResponse.json({ data: cabinet }, { status: HTTP_STATUS.CREATED });
  } catch (error) {
    return handleRouteError(error, "POST /api/cabinets");
  }
}
