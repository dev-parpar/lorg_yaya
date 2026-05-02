import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { getAccessibleLocation } from "@/lib/db/access";
import { downloadManifest } from "@/lib/storage/sync-storage";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { HTTP_STATUS } from "@/lib/constants";

type Params = { params: Promise<{ locationId: string }> };

// GET /api/sync/[locationId]/manifest
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { locationId } = await params;
    await getAccessibleLocation(locationId, userId);

    const manifest = await downloadManifest(locationId);

    return NextResponse.json({ data: manifest }, { status: HTTP_STATUS.OK });
  } catch (error) {
    return handleRouteError(error, "GET /api/sync/[locationId]/manifest");
  }
}
