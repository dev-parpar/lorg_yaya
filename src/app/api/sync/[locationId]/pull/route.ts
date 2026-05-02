import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { getAccessibleLocation } from "@/lib/db/access";
import { downloadManifest, generateSyncDownloadUrl } from "@/lib/storage/sync-storage";
import { handleRouteError, UnauthorizedError, AppError } from "@/lib/errors";
import { HTTP_STATUS } from "@/lib/constants";

type Params = { params: Promise<{ locationId: string }> };

// POST /api/sync/[locationId]/pull
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { locationId } = await params;
    await getAccessibleLocation(locationId, userId);

    const manifest = await downloadManifest(locationId);
    if (!manifest) {
      return NextResponse.json({ data: null }, { status: HTTP_STATUS.OK });
    }

    const url = await generateSyncDownloadUrl(locationId);
    if (!url) {
      throw new AppError("Failed to generate sync download URL", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    return NextResponse.json({ data: { url, manifest } }, { status: HTTP_STATUS.OK });
  } catch (error) {
    return handleRouteError(error, "POST /api/sync/[locationId]/pull");
  }
}
