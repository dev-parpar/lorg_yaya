import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { InviteStatus } from "@prisma/client";

type Params = { params: Promise<{ inviteId: string }> };

const respondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

/**
 * PATCH /api/invites/[inviteId]
 *
 * Invitee only. Accepts or declines a pending invite.
 * Body: { action: "accept" | "decline" }
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { inviteId } = await params;

    const invite = await prisma.locationMember.findFirst({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundError("Invite");
    if (invite.userId !== userId) throw new ForbiddenError();
    if (invite.status !== InviteStatus.PENDING) {
      return NextResponse.json(
        { error: "This invite has already been responded to." },
        { status: 409 },
      );
    }

    const body = await request.json();
    const { action } = respondSchema.parse(body);

    const updated = await prisma.locationMember.update({
      where: { id: inviteId },
      data: {
        status: action === "accept" ? InviteStatus.ACCEPTED : InviteStatus.DECLINED,
        respondedAt: new Date(),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/invites/[inviteId]");
  }
}
