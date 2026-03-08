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

    // ── 2. Hard-delete the Supabase auth user ────────────────────────────────
    // Deleting the auth user:
    //   - Immediately invalidates all active sessions (user cannot log in)
    //   - Frees the email address so it can be used for a new registration
    //   - Does NOT touch database rows — RLS is unaffected
    // The profile row above is retained as a soft-delete audit record.
    // This requires the service_role key, which is the intended use:
    // auth.admin operations are explicitly excluded from RLS concerns.
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      // Non-fatal: profile is already marked for deletion.
      // The user's API access is already blocked by the deletionRequestedAt guard.
      console.error("[DELETE /api/account] Failed to delete auth user:", deleteAuthError.message);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/account");
  }
}
