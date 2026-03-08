import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";

/**
 * DELETE /api/account
 *
 * Permanently deletes the authenticated user's account in this order:
 *  1. All locations (cascades → cabinets → shelves → items via DB relations)
 *  2. Profile record
 *  3. Supabase auth user (requires service_role key — server-side only)
 *
 * The service_role key is never exposed to the client.
 */
export async function DELETE() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    // ── 1. Delete all inventory data owned by this user ──────────────────────
    // Locations cascade to cabinets, shelves, and items via foreign keys.
    await prisma.location.deleteMany({ where: { userId } });

    // ── 2. Delete the user's profile ─────────────────────────────────────────
    await prisma.profile.deleteMany({ where: { userId } });

    // ── 3. Delete the Supabase auth user via Admin API ───────────────────────
    // This requires the service_role key which is only available server-side.
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      throw new Error(`Failed to delete auth user: ${deleteAuthError.message}`);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/account");
  }
}
