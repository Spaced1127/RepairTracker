import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client that bypasses row-level security. It is used for the public pay page and the
 * Stripe webhook, where nobody is signed in. Never import this from a client component.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
}
