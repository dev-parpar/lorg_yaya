import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { getUserInventory } from "@/lib/voice/inventory-queries";

/**
 * GET /api/inventory/full
 *
 * Returns the entire accessible inventory for the authenticated user as a flat
 * list suitable for inclusion in an AI system prompt. Covers both owned
 * locations and locations the user has been invited to (ACCEPTED status).
 *
 * The query logic lives in `src/lib/voice/inventory-queries.ts` so it can be
 * shared with the voice assistant fulfillment handler.
 */
export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    const flatItems = await getUserInventory(userId);

    return NextResponse.json({ data: flatItems });
  } catch (error) {
    return handleRouteError(error, "GET /api/inventory/full");
  }
}
