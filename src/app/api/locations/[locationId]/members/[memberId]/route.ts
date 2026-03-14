import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { InviteStatus } from "@prisma/client";

type Params = { params: Promise<{ locationId: string; memberId: string }> };

/**
 * DELETE /api/locations/[locationId]/members/[memberId]
 *
 * Two allowed callers:
 *  - The location owner — can remove any member (REVOKED)
 *  - The member themselves — can leave (REVOKED)
 *
 * memberId is the LocationMember row id.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { locationId, memberId } = await params;

    const member = await prisma.locationMember.findFirst({
      where: { id: memberId, locationId },
      include: { location: true },
    });
    if (!member) throw new NotFoundError("Member");

    const isOwner = member.location.userId === userId;
    const isSelf = member.userId === userId;

    if (!isOwner && !isSelf) throw new ForbiddenError();

    await prisma.locationMember.update({
      where: { id: memberId },
      data: { status: InviteStatus.REVOKED, respondedAt: new Date() },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/locations/[locationId]/members/[memberId]");
  }
}
