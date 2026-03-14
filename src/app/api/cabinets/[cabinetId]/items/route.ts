import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { parsePagination } from "@/lib/validations/pagination";
import { getAccessibleCabinet } from "@/lib/db/access";

type Params = { params: Promise<{ cabinetId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { cabinetId } = await params;
    await getAccessibleCabinet(cabinetId, userId);

    const { page, pageSize } = parsePagination(request.nextUrl.searchParams);
    const skip = (page - 1) * pageSize;

    // Optional filter: shelf=null returns only unassigned items, shelf=<id> filters by shelf
    const shelfParam = request.nextUrl.searchParams.get("shelf");
    const shelfFilter =
      shelfParam === "none"
        ? { shelfId: null }
        : shelfParam
          ? { shelfId: shelfParam }
          : {};

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where: { cabinetId, deletedAt: null, ...shelfFilter },
        include: { shelf: true },
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.item.count({ where: { cabinetId, deletedAt: null, ...shelfFilter } }),
    ]);

    return NextResponse.json({ data: items, meta: { total, page, pageSize } });
  } catch (error) {
    return handleRouteError(error, "GET /api/cabinets/[cabinetId]/items");
  }
}
