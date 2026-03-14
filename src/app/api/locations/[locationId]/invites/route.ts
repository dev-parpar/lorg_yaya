import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { HTTP_STATUS } from "@/lib/constants";
import { assertLocationOwner } from "@/lib/db/access";
import { InviteStatus } from "@prisma/client";

type Params = { params: Promise<{ locationId: string }> };

const inviteSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(30),
});

/**
 * POST /api/locations/[locationId]/invites
 *
 * Owner-only. Looks up the target user by username and creates a PENDING
 * LocationMember record. Idempotent — re-inviting a DECLINED or REVOKED
 * user resets the invite to PENDING.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { locationId } = await params;
    await assertLocationOwner(locationId, userId);

    const body = await request.json();
    const { username } = inviteSchema.parse(body);

    // Look up the target user by username
    const targetProfile = await prisma.profile.findFirst({
      where: { username, status: "ACTIVE" },
    });
    if (!targetProfile) {
      return NextResponse.json(
        { error: "No active user found with that username." },
        { status: 404 },
      );
    }

    // Cannot invite yourself
    if (targetProfile.userId === userId) {
      return NextResponse.json(
        { error: "You cannot invite yourself to your own location." },
        { status: 400 },
      );
    }

    // Upsert: create or reset an existing non-ACCEPTED invite
    const existing = await prisma.locationMember.findUnique({
      where: { locationId_userId: { locationId, userId: targetProfile.userId } },
    });

    if (existing?.status === InviteStatus.ACCEPTED) {
      return NextResponse.json(
        { error: "This user is already a member of this location." },
        { status: 409 },
      );
    }

    const member = existing
      ? await prisma.locationMember.update({
          where: { id: existing.id },
          data: { status: InviteStatus.PENDING, invitedBy: userId, respondedAt: null },
        })
      : await prisma.locationMember.create({
          data: { locationId, userId: targetProfile.userId, invitedBy: userId },
        });

    return NextResponse.json({ data: member }, { status: HTTP_STATUS.CREATED });
  } catch (error) {
    return handleRouteError(error, "POST /api/locations/[locationId]/invites");
  }
}

/**
 * GET /api/locations/[locationId]/members
 *
 * Owner or accepted member. Returns all ACCEPTED members plus the owner's
 * profile so the UI can render a complete member list.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { locationId } = await params;

    // Verify access (owner or member)
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        deletedAt: null,
        OR: [
          { userId },
          { members: { some: { userId, status: InviteStatus.ACCEPTED } } },
        ],
      },
    });
    if (!location) throw new ForbiddenError();

    const members = await prisma.locationMember.findMany({
      where: { locationId, status: { in: [InviteStatus.PENDING, InviteStatus.ACCEPTED] } },
      orderBy: { invitedAt: "asc" },
    });

    // Attach username for display
    const userIds = members.map((m) => m.userId);
    const profiles = await prisma.profile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, username: true },
    });
    const profileMap = Object.fromEntries(profiles.map((p) => [p.userId, p.username]));

    // Also include the owner
    const ownerProfile = await prisma.profile.findFirst({
      where: { userId: location.userId },
      select: { userId: true, username: true },
    });

    const data = {
      owner: { userId: location.userId, username: ownerProfile?.username ?? null },
      members: members.map((m) => ({
        ...m,
        username: profileMap[m.userId] ?? null,
      })),
    };

    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(error, "GET /api/locations/[locationId]/members");
  }
}
