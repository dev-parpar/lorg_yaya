import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { parsePagination } from "@/lib/validations/pagination";
import { getAccessibleShelf } from "@/lib/db/access";

type Params = { params: Promise<{ shelfId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { shelfId } = await params;
    await getAccessibleShelf(shelfId, userId);

    const { page, pageSize } = parsePagination(request.nextUrl.searchParams);
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where: { shelfId, deletedAt: null },
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.item.count({ where: { shelfId, deletedAt: null } }),
    ]);

    return NextResponse.json({ data: items, meta: { total, page, pageSize } });
  } catch (error) {
    return handleRouteError(error, "GET /api/shelves/[shelfId]/items");
  }
}
