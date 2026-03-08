import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import {
  handleRouteError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import { updateLocationSchema } from "@/lib/validations/location";

type Params = { params: Promise<{ locationId: string }> };

async function getOwnedLocation(locationId: string, userId: string) {
  const location = await prisma.location.findFirst({
    where: { id: locationId, deletedAt: null },
  });
  if (!location) throw new NotFoundError("Location");
  if (location.userId !== userId) throw new ForbiddenError();
  return location;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { locationId } = await params;
    const location = await getOwnedLocation(locationId, userId);

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
    await getOwnedLocation(locationId, userId);

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
    await getOwnedLocation(locationId, userId);

    // Soft delete — preserves audit trail
    await prisma.location.update({
      where: { id: locationId },
      data: { deletedAt: new Date() },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/locations/[locationId]");
  }
}
