import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

/** Browser-side Supabase client (auth + storage from client components). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(publicEnv.SUPABASE_URL, publicEnv.SUPABASE_ANON_KEY);
}
