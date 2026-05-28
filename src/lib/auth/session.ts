import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Fetch the currently-authenticated Supabase user, or null.
 * Use in admin layouts/pages.
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/**
 * Require an authenticated admin. Redirects to /login if missing.
 */
export async function requireAdmin(locale: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }
  return user;
}
