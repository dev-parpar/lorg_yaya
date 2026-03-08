import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { createLocationSchema } from "@/lib/validations/location";
import { parsePagination } from "@/lib/validations/pagination";
import { HTTP_STATUS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { page, pageSize } = parsePagination(request.nextUrl.searchParams);
    const skip = (page - 1) * pageSize;

    const [locations, total] = await Promise.all([
      prisma.location.findMany({
        where: { userId, deletedAt: null },
        include: { _count: { select: { cabinets: { where: { deletedAt: null } } } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.location.count({ where: { userId, deletedAt: null } }),
    ]);

    return NextResponse.json({ data: locations, meta: { total, page, pageSize } });
  } catch (error) {
    return handleRouteError(error, "GET /api/locations");
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const body = await request.json();
    const input = createLocationSchema.parse(body);

    const location = await prisma.location.create({
      data: { ...input, userId },
    });

    return NextResponse.json({ data: location }, { status: HTTP_STATUS.CREATED });
  } catch (error) {
    return handleRouteError(error, "POST /api/locations");
  }
}
