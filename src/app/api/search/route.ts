import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { parsePagination } from "@/lib/validations/pagination";
import { InviteStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ data: [], meta: { total: 0 } });
    }

    const { page, pageSize } = parsePagination(request.nextUrl.searchParams);
    const skip = (page - 1) * pageSize;

    // Scope search to locations the user owns OR is an accepted member of.
    const locationAccessFilter = {
      deletedAt: null,
      OR: [
        { userId },
        { members: { some: { userId, status: InviteStatus.ACCEPTED } } },
      ],
    };

    const itemWhere = {
      deletedAt: null,
      cabinet: { deletedAt: null, location: locationAccessFilter },
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
        { tags: { has: q } },
      ],
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where: itemWhere,
        include: {
          cabinet: { include: { location: true } },
          shelf: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.item.count({ where: itemWhere }),
    ]);

    return NextResponse.json({ data: items, meta: { total, page, pageSize, q } });
  } catch (error) {
    return handleRouteError(error, "GET /api/search");
  }
}
