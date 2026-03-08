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

type Params = { params: Promise<{ cabinetId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { cabinetId } = await params;

    const cabinet = await prisma.cabinet.findFirst({
      where: { id: cabinetId, deletedAt: null },
      include: { location: true },
    });
    if (!cabinet) throw new NotFoundError("Cabinet");
    if (cabinet.location.userId !== userId) throw new ForbiddenError();

    const { page, pageSize } = parsePagination(request.nextUrl.searchParams);
    const skip = (page - 1) * pageSize;

    const [shelves, total] = await Promise.all([
      prisma.shelf.findMany({
        where: { cabinetId, deletedAt: null },
        include: { _count: { select: { items: { where: { deletedAt: null } } } } },
        orderBy: { position: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.shelf.count({ where: { cabinetId, deletedAt: null } }),
    ]);

    return NextResponse.json({ data: shelves, meta: { total, page, pageSize } });
  } catch (error) {
    return handleRouteError(error, "GET /api/cabinets/[cabinetId]/shelves");
  }
}
