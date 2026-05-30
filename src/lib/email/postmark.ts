import { Resend } from "resend";
import { getEnv } from "@/lib/env";

/**
 * Resend wrapper (replaces Postmark). If RESEND_API_KEY is missing we log to
 * the console instead of throwing — keeps the app usable in dev without email
 * configured.
 */

let cachedClient: Resend | null | undefined;

/**
 * Resend's free shared sender. Works without a verified domain, so platform
 * notifications can always reach the client's inbox.
 */
export const DEFAULT_FROM = "RenoJo <onboarding@resend.dev>";

function getClient(): Resend | null {
  if (cachedClient !== undefined) return cachedClient;
  const env = getEnv();
  if (!env.RESEND_API_KEY) {
    cachedClient = null;
    return null;
  }
  cachedClient = new Resend(env.RESEND_API_KEY);
  return cachedClient;
}

export type SendEmailParams = {
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: Array<{
    Name: string;
    Content: string; // base64
    ContentType: string;
    ContentID?: string | null;
  }>;
};

export type SendEmailResult =
  | { ok: true; messageId: string; skipped?: false }
  | { ok: true; messageId: null; skipped: true; reason: string };

/**
 * Send a transactional email. Returns `skipped: true` when Resend is not configured.
 * Never throws for missing config — caller can decide to surface a warning.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const env = getEnv();
  const client = getClient();
  if (!client) {
    console.warn("[resend] skipped (not configured):", params.subject, "→", params.to);
    return { ok: true, messageId: null, skipped: true, reason: "resend_not_configured" };
  }
  const from = params.from ?? env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;
  if (!from) {
    console.warn("[resend] skipped (no from address):", params.subject);
    return { ok: true, messageId: null, skipped: true, reason: "missing_from" };
  }

  const { data, error } = await client.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    text: params.textBody,
    html: params.htmlBody,
    replyTo: params.replyTo ?? env.OWNER_EMAIL,
    headers: params.headers,
    attachments: params.attachments?.map((a) => ({
      filename: a.Name,
      content: a.Content, // base64 string — Resend accepts it directly
      content_type: a.ContentType,
    })),
  });

  if (error || !data?.id) {
    throw new Error(`[resend] send failed: ${error?.message ?? "unknown error"}`);
  }
  return { ok: true, messageId: data.id };
}

/**
 * Build a reply-to address. Without an inbound service we fall back to the
 * owner email (so replies land in Joe's Gmail) or the admin FROM address.
 */
export function buildReplyToAddress(_inboundKey: string): string | null {
  const env = getEnv();
  return env.OWNER_EMAIL ?? env.RESEND_FROM_EMAIL ?? null;
}
