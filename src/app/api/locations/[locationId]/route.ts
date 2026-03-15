import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { updateLocationSchema } from "@/lib/validations/location";
import { getAccessibleLocation, assertLocationOwner } from "@/lib/db/access";

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
    // Both owner and members can edit location metadata (name, address, type)
    await getAccessibleLocation(locationId, userId);

    const body = await request.json();
    const input = updateLocationSchema.parse(body);

    const updated = await prisma.location.update({
      where: { id: locationId },
      data: input,
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
    // Only the owner may delete a location
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
