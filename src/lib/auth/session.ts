import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { adminUsers, clients } from "@/lib/db/schema";

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
 * Look up the admin_users row for a given auth user id, or null.
 */
export async function getAdminForUser(authUserId: string) {
  const [row] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.authUserId, authUserId))
    .limit(1);
  return row ?? null;
}

/**
 * Look up the client row linked to a given auth user id, or null.
 */
export async function getClientForUser(authUserId: string) {
  const [row] = await db
    .select()
    .from(clients)
    .where(eq(clients.authUserId, authUserId))
    .limit(1);
  return row ?? null;
}

/**
 * Require an authenticated admin. Verifies membership in admin_users.
 * Redirects to /login if not authenticated or not an admin.
 */
export async function requireAdmin(locale: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }
  const admin = await getAdminForUser(user.id);
  if (!admin) {
    redirect(`/${locale}/login`);
  }
  return user;
}

/**
 * Require an authenticated client linked to a client record.
 * Redirects to /login if not authenticated or not a client.
 */
export async function requireClient(locale: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }
  const client = await getClientForUser(user.id);
  if (!client) {
    redirect(`/${locale}/login`);
  }
  return { user, client };
}

/**
 * Decide where a user should land after login based on their role.
 * Admins → /admin, linked clients → /espace-client, otherwise /login.
 */
export async function getPostLoginRedirect(locale: string) {
  const user = await getCurrentUser();
  if (!user) return `/${locale}/login`;
  const admin = await getAdminForUser(user.id);
  if (admin) return `/${locale}/admin`;
  const client = await getClientForUser(user.id);
  if (client) return `/${locale}/espace-client`;
  return `/${locale}/login`;
}
