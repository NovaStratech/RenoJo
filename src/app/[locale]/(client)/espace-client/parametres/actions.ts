"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { requireClient } from "@/lib/auth/session";

export type NotificationPrefsState =
  | { ok: false; error?: string }
  | { ok: true };

export async function updateNotificationPrefs(
  locale: string,
  _prev: NotificationPrefsState,
  formData: FormData,
): Promise<NotificationPrefsState> {
  const { client } = await requireClient(locale);

  const notifyOnMessage = formData.get("notifyOnMessage") === "on";
  const notifyOnQuote = formData.get("notifyOnQuote") === "on";

  await db
    .update(clients)
    .set({ notifyOnMessage, notifyOnQuote, updatedAt: new Date() })
    .where(eq(clients.id, client.id));

  revalidatePath(`/${locale}/espace-client/parametres`);
  return { ok: true };
}
