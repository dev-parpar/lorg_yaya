import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { createShelfSchema } from "@/lib/validations/shelf";
import { HTTP_STATUS } from "@/lib/constants";
import { assertCabinetAccess } from "@/lib/db/access";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const body = await request.json();
    const input = createShelfSchema.parse(body);

    await assertCabinetAccess(input.cabinetId, userId);

    const shelf = await prisma.shelf.create({ data: input });

    return NextResponse.json({ data: shelf }, { status: HTTP_STATUS.CREATED });
  } catch (error) {
    return handleRouteError(error, "POST /api/shelves");
  }
}
