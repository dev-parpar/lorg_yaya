import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore
          }
        },
      },
    },
  );
}

/**
 * Returns the authenticated user ID from the current request.
 *
 * Supports two auth strategies:
 *  1. Bearer token in Authorization header — used by the mobile app
 *  2. Cookie-based session — used by the web app (Supabase SSR)
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  let userId: string | null = null;

  // ── Strategy 1: Bearer token (mobile / API clients) ──────────────────────
  const headerStore = await headers();
  const authHeader = headerStore.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: { user } } = await supabase.auth.getUser(token);
    userId = user?.id ?? null;
  } else {
    // ── Strategy 2: Cookie session (web browser) ────────────────────────────
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  if (!userId) return null;

  // ── Guard: reject accounts pending deletion (applies to both strategies) ──
  // From the user's perspective the account is deleted. This blocks all
  // further API access immediately after a deletion request is submitted.
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { deletionRequestedAt: true },
  });

  if (profile?.deletionRequestedAt) return null;

  return userId;
}
