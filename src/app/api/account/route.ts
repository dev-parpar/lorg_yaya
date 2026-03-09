import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { supabaseAdmin } from "@/lib/auth/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { ProfileStatus } from "@prisma/client";

/**
 * DELETE /api/account
 *
 * Permanently deletes the authenticated user's account.
 *
 * Strategy (Option A — hard delete):
 *  1. Mark Profile.status = DELETED in our database (audit record preserved)
 *  2. Hard-delete the Supabase auth user — this immediately frees the email
 *     address for re-registration and invalidates all active sessions/tokens.
 *
 * Result for the user: account is gone, email + username are available again.
 * Result internally: inventory data (locations, cabinets, items) is preserved
 * as an audit trail keyed by the now-dead userId.
 *
 * The service_role key is required for auth.admin.deleteUser — it is an auth
 * admin operation, not a data operation. It does not bypass RLS on our tables.
 */
export async function DELETE() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new UnauthorizedError();

    // ── 1. Mark profile as DELETED ───────────────────────────────────────────
    // Idempotent — safe to call multiple times.
    await prisma.profile.updateMany({
      where: { userId },
      data: { status: ProfileStatus.DELETED, deletedAt: new Date() },
    });

    // ── 2. Hard-delete the Supabase auth user ────────────────────────────────
    // Frees the email address immediately so the same email can be used to
    // register a new account. Also invalidates all active sessions and tokens
    // for this userId — no separate session revocation step needed.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      // Non-fatal: profile is already marked DELETED so the user is effectively
      // locked out via our API guard. Log for ops visibility.
      console.error("[DELETE /api/account] Failed to hard-delete auth user:", deleteError.message);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/account");
  }
}
