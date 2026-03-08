import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { supabaseAdmin } from "@/lib/auth/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";

/**
 * DELETE /api/account
 *
 * Requests deletion of the authenticated user's account.
 *
 * From the user's perspective: account is deleted immediately.
 * Internally: soft delete — sets deletionRequestedAt on the profile and
 * revokes all active Supabase sessions. A scheduled background job
 * hard-purges accounts after the grace period.
 *
 * This approach provides:
 * - A recovery window for accidental deletions (ops/support team can restore)
 * - An audit trail (deletion timestamp is preserved)
 * - GDPR compliance (request is recorded; purge can be scheduled)
 *
 * The service_role key is isolated in supabase-admin.ts and never inlined
 * in route handlers.
 */
export async function DELETE() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    // ── 1. Mark profile as deletion-requested ────────────────────────────────
    // Idempotent — if already requested, update the timestamp and continue.
    await prisma.profile.updateMany({
      where: { userId },
      data: { deletionRequestedAt: new Date() },
    });

    // ── 2. Ban the Supabase auth user ────────────────────────────────────────
    // Setting ban_duration prevents future sign-in attempts with these
    // credentials. 876600h ≈ 100 years (effectively permanent).
    // This is the correct primitive — session revocation only kills existing
    // tokens but does not block new logins. Banning does both.
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { ban_duration: "876600h" },
    );

    if (banError) {
      // Non-fatal: profile is already marked for deletion. Log and continue.
      console.error("[DELETE /api/account] Failed to ban auth user:", banError.message);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/account");
  }
}
