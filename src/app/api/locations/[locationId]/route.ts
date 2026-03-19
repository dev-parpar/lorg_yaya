import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { updateLocationSchema } from "@/lib/validations/location";
import { getAccessibleLocation, assertLocationOwner } from "@/lib/db/access";
import { generateSignedUrl } from "@/lib/storage/sign";

type Params = { params: Promise<{ locationId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { locationId } = await params;
    const location = await getAccessibleLocation(locationId, userId);

    return NextResponse.json({ data: location });
  } catch (error) {
    return handleRouteError(error, "GET /api/locations/[locationId]");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { locationId } = await params;
    const existing = await getAccessibleLocation(locationId, userId);

    const body = await request.json();
    const { imagePath, ...rest } = updateLocationSchema.parse(body);

    let imageUpdate: { imagePath?: string | null; signedImageUrl?: string | null } = {};

    if (imagePath === null) {
      imageUpdate = { imagePath: null, signedImageUrl: null };
    } else if (imagePath !== undefined) {
      // New photo uploaded — generate stable signed URL
      const signedImageUrl = await generateSignedUrl("locations", imagePath);
      imageUpdate = { imagePath, signedImageUrl };
    }

    const updated = await prisma.location.update({
      where: { id: locationId },
      data: { ...rest, ...imageUpdate },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/locations/[locationId]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { locationId } = await params;
    await assertLocationOwner(locationId, userId);

    await prisma.location.update({
      where: { id: locationId },
      data: { deletedAt: new Date() },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/locations/[locationId]");
  }
}
