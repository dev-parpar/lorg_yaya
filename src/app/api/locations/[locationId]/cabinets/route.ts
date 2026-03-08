import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import {
  handleRouteError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import { parsePagination } from "@/lib/validations/pagination";

type Params = { params: Promise<{ locationId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { locationId } = await params;

    const location = await prisma.location.findFirst({
      where: { id: locationId, deletedAt: null },
    });
    if (!location) throw new NotFoundError("Location");
    if (location.userId !== userId) throw new ForbiddenError();

    const { page, pageSize } = parsePagination(request.nextUrl.searchParams);
    const skip = (page - 1) * pageSize;

    const [cabinets, total] = await Promise.all([
      prisma.cabinet.findMany({
        where: { locationId, deletedAt: null },
        include: {
          _count: {
            select: {
              shelves: { where: { deletedAt: null } },
              items: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.cabinet.count({ where: { locationId, deletedAt: null } }),
    ]);

    return NextResponse.json({ data: cabinets, meta: { total, page, pageSize } });
  } catch (error) {
    return handleRouteError(error, "GET /api/locations/[locationId]/cabinets");
  }
}
