"use server";

import { requireAdmin } from "@/lib/auth/session";
import {
  draftReplyForProject,
  summarizeProject,
  suggestQuoteLines,
  type SuggestedLine,
} from "@/lib/ai/drafts";

export type AIActionResult<T> =
  | { ok: true; data: T; cached?: boolean }
  | { ok: false; error: string };

export async function aiDraftReply(
  locale: string,
  projectId: string,
): Promise<AIActionResult<string>> {
  await requireAdmin(locale);
  return draftReplyForProject(projectId, (locale as "fr" | "en") ?? "fr");
}

export async function aiSummarize(
  locale: string,
  projectId: string,
): Promise<AIActionResult<string>> {
  await requireAdmin(locale);
  return summarizeProject(projectId, (locale as "fr" | "en") ?? "fr");
}

export async function aiSuggestQuoteLines(
  locale: string,
  projectId: string,
): Promise<AIActionResult<SuggestedLine[]>> {
  await requireAdmin(locale);
  return suggestQuoteLines(projectId, (locale as "fr" | "en") ?? "fr");
}
