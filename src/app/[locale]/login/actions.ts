"use server";

import { getPostLoginRedirect } from "@/lib/auth/session";

/**
 * Decide where the just-authenticated user should land based on their role.
 * Returns an absolute, locale-prefixed path.
 */
export async function resolvePostLogin(locale: string): Promise<string> {
  return getPostLoginRedirect(locale);
}
