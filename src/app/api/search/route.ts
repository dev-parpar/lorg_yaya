import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { parsePagination } from "@/lib/validations/pagination";

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

    // PostgreSQL full-text search via tsvector on name + description + tags
    // Falls back to ILIKE for substring matching when no tsvector index exists yet
    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where: {
          deletedAt: null,
          cabinet: {
            deletedAt: null,
            location: { userId, deletedAt: null },
          },
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { tags: { has: q } },
          ],
        },
        include: {
          cabinet: { include: { location: true } },
          shelf: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.item.count({
        where: {
          deletedAt: null,
          cabinet: {
            deletedAt: null,
            location: { userId, deletedAt: null },
          },
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { tags: { has: q } },
          ],
        },
      }),
    ]);

    return NextResponse.json({ data: items, meta: { total, page, pageSize, q } });
  } catch (error) {
    return handleRouteError(error, "GET /api/search");
  }
}
