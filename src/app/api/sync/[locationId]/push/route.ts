import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { getAccessibleLocation } from "@/lib/db/access";
import {
  downloadManifest,
  uploadManifest,
  uploadOplog,
} from "@/lib/storage/sync-storage";
import { pushBodySchema } from "@/lib/validations/sync";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { HTTP_STATUS } from "@/lib/constants";

type Params = { params: Promise<{ locationId: string }> };

// POST /api/sync/[locationId]/push
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const { locationId } = await params;
    await getAccessibleLocation(locationId, userId);

    const raw = await request.json();
    const body = pushBodySchema.parse(raw);

    // Reject stale pushes: the incoming opCount must not be less than what is
    // already stored. This prevents a device on an old snapshot from overwriting
    // a newer oplog.
    const existing = await downloadManifest(locationId);
    if (existing && body.manifest.opCount < existing.opCount) {
      return NextResponse.json(
        { error: "Stale push: opCount must not decrease" },
        { status: HTTP_STATUS.CONFLICT },
      );
    }

    const buffer = Buffer.from(body.oplog, "base64");
    await uploadOplog(locationId, buffer);
    await uploadManifest(locationId, body.manifest);

    return NextResponse.json(
      { data: { accepted: true, manifest: body.manifest } },
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    return handleRouteError(error, "POST /api/sync/[locationId]/push");
  }
}
