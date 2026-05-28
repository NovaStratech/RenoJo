import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses RLS — use ONLY in trusted server code
 * (e.g. webhooks, server actions after auth check). Never expose to client.
 */
export function createSupabaseServiceClient() {
  const env = getEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
