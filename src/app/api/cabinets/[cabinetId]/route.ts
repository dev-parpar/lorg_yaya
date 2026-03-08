import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import {
  handleRouteError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import { updateCabinetSchema } from "@/lib/validations/cabinet";

type Params = { params: Promise<{ cabinetId: string }> };

async function getOwnedCabinet(cabinetId: string, userId: string) {
  const cabinet = await prisma.cabinet.findFirst({
    where: { id: cabinetId, deletedAt: null },
    include: { location: true },
  });
  if (!cabinet) throw new NotFoundError("Cabinet");
  if (cabinet.location.userId !== userId) throw new ForbiddenError();
  return cabinet;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { cabinetId } = await params;
    const cabinet = await getOwnedCabinet(cabinetId, userId);

    return NextResponse.json({ data: cabinet });
  } catch (error) {
    return handleRouteError(error, "GET /api/cabinets/[cabinetId]");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { cabinetId } = await params;
    await getOwnedCabinet(cabinetId, userId);

    const body = await request.json();
    const input = updateCabinetSchema.parse(body);

    const updated = await prisma.cabinet.update({
      where: { id: cabinetId },
      data: input,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/cabinets/[cabinetId]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { cabinetId } = await params;
    await getOwnedCabinet(cabinetId, userId);

    await prisma.cabinet.update({
      where: { id: cabinetId },
      data: { deletedAt: new Date() },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/cabinets/[cabinetId]");
  }
}
