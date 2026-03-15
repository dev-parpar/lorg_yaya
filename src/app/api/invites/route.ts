import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { InviteStatus } from "@prisma/client";

/**
 * GET /api/invites
 *
 * Returns all PENDING invites for the authenticated user, with location
 * details so the UI can render "You're invited to <location name>".
 */
export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const invites = await prisma.locationMember.findMany({
      where: { userId, status: InviteStatus.PENDING },
      include: {
        location: {
          select: { id: true, name: true, type: true, address: true },
        },
      },
      orderBy: { invitedAt: "desc" },
    });

    // Attach the inviter's username for display
    const inviterIds = invites.map((i) => i.invitedBy);
    const inviters = await prisma.profile.findMany({
      where: { userId: { in: inviterIds } },
      select: { userId: true, username: true },
    });
    const inviterMap = Object.fromEntries(inviters.map((p) => [p.userId, p.username]));

    const data = invites.map((inv) => ({
      ...inv,
      invitedByUsername: inviterMap[inv.invitedBy] ?? null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(error, "GET /api/invites");
  }
}
