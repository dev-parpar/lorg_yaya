import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { HTTP_STATUS } from "@/lib/constants";

/**
 * GET /api/key-shares/pending
 *
 * Returns all unclaimed key shares addressed to the authenticated user.
 * Called by a new device on first sync to retrieve the encrypted location keys
 * the owner has deposited for it.
 */
export async function GET(_request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const keyShares = await prisma.locationKeyShare.findMany({
      where: { recipientId: userId, claimedAt: null },
    });

    return NextResponse.json({ data: keyShares }, { status: HTTP_STATUS.OK });
  } catch (error) {
    return handleRouteError(error, "GET /api/key-shares/pending");
  }
}
