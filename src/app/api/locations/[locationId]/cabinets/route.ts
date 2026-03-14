import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { parsePagination } from "@/lib/validations/pagination";
import { getAccessibleLocation } from "@/lib/db/access";

type Params = { params: Promise<{ locationId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { locationId } = await params;
    await getAccessibleLocation(locationId, userId);

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
