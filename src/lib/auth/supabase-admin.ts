import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase admin client.
 *
 * Uses the service_role key which bypasses Row Level Security.
 * NEVER import this file in client components or expose it to the browser.
 * Restricted to server-side admin operations only (session revocation, etc.).
 */
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Ensure both are set in environment variables.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Singleton — instantiated once per server process, not per request
const globalForAdmin = globalThis as unknown as { supabaseAdmin?: ReturnType<typeof createAdminClient> };

export const supabaseAdmin = globalForAdmin.supabaseAdmin ?? createAdminClient();

if (process.env.NODE_ENV !== "production") {
  globalForAdmin.supabaseAdmin = supabaseAdmin;
}
