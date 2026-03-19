import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { updateCabinetSchema } from "@/lib/validations/cabinet";
import { getAccessibleCabinet } from "@/lib/db/access";
import { generateSignedUrl } from "@/lib/storage/sign";

type Params = { params: Promise<{ cabinetId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { cabinetId } = await params;
    const cabinet = await getAccessibleCabinet(cabinetId, userId);

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
    const existing = await getAccessibleCabinet(cabinetId, userId);

    const body = await request.json();
    const { imagePath, ...rest } = updateCabinetSchema.parse(body);

    let imageUpdate: { imagePath?: string | null; signedImageUrl?: string | null } = {};

    if (imagePath === null) {
      imageUpdate = { imagePath: null, signedImageUrl: null };
    } else if (imagePath !== undefined) {
      const signedImageUrl = await generateSignedUrl("cabinets", imagePath);
      imageUpdate = { imagePath, signedImageUrl };
    }

    const updated = await prisma.cabinet.update({
      where: { id: cabinetId },
      data: { ...rest, ...imageUpdate },
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
    await getAccessibleCabinet(cabinetId, userId);

    await prisma.cabinet.update({
      where: { id: cabinetId },
      data: { deletedAt: new Date() },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/cabinets/[cabinetId]");
  }
}
