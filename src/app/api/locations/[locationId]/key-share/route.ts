import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { assertLocationOwner } from "@/lib/db/access";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { createKeyShareSchema } from "@/lib/validations/key-share";
import { HTTP_STATUS } from "@/lib/constants";

type Params = { params: Promise<{ locationId: string }> };

/**
 * POST /api/locations/[locationId]/key-share
 *
 * Owner only. Uploads an encrypted location key for a specific recipient so
 * the recipient can decrypt and adopt it on their next sync.
 *
 * The upsert behaviour allows the owner to re-share after a key rotation:
 * updating an existing share resets claimedAt so the recipient picks it up again.
 *
 * Body: { recipientId, encryptedKey, nonce }
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { locationId } = await params;

    // Only the location owner may share its encryption key.
    await assertLocationOwner(locationId, userId);

    const body = await request.json();
    const { recipientId, encryptedKey, nonce } = createKeyShareSchema.parse(body);

    const keyShare = await prisma.locationKeyShare.upsert({
      where: { locationId_recipientId: { locationId, recipientId } },
      create: { locationId, recipientId, encryptedKey, nonce },
      update: {
        encryptedKey,
        nonce,
        // Reset claimedAt so the recipient knows to re-fetch the new key.
        claimedAt: null,
      },
    });

    return NextResponse.json({ data: keyShare }, { status: HTTP_STATUS.CREATED });
  } catch (error) {
    return handleRouteError(error, "POST /api/locations/[locationId]/key-share");
  }
}
