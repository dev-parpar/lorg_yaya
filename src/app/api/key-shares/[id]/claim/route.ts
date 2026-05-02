import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { HTTP_STATUS } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/key-shares/[id]/claim
 *
 * Recipient only. Marks a key share as claimed after the device has
 * successfully decrypted and persisted the location encryption key locally.
 *
 * Idempotency: returns 409 if already claimed so callers can detect
 * double-claim scenarios (e.g. a retry after a network failure).
 */
export async function PATCH(_request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { id } = await params;

    const keyShare = await prisma.locationKeyShare.findFirst({
      where: { id },
    });
    if (!keyShare) throw new NotFoundError("KeyShare");

    // Only the intended recipient may claim a key share.
    if (keyShare.recipientId !== userId) throw new ForbiddenError();

    if (keyShare.claimedAt !== null) {
      return NextResponse.json(
        { error: "This key share has already been claimed." },
        { status: HTTP_STATUS.CONFLICT },
      );
    }

    const updated = await prisma.locationKeyShare.update({
      where: { id },
      data: { claimedAt: new Date() },
    });

    return NextResponse.json({ data: updated }, { status: HTTP_STATUS.OK });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/key-shares/[id]/claim");
  }
}
