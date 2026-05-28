import { ServerClient, type Message as PostmarkMessage } from "postmark";
import { getEnv } from "@/lib/env";

/**
 * Postmark wrapper. If POSTMARK_SERVER_TOKEN is missing we log to the
 * console instead of throwing — this keeps the app usable in dev without
 * email configured.
 */

let cachedClient: ServerClient | null | undefined;

function getClient(): ServerClient | null {
  if (cachedClient !== undefined) return cachedClient;
  const env = getEnv();
  if (!env.POSTMARK_SERVER_TOKEN) {
    cachedClient = null;
    return null;
  }
  cachedClient = new ServerClient(env.POSTMARK_SERVER_TOKEN);
  return cachedClient;
}

export type SendEmailParams = {
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  from?: string;
  replyTo?: string;
  messageStream?: string;
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
 * Send a transactional email. Returns `skipped: true` when Postmark is not configured.
 * Never throws for missing config — caller can decide to surface a warning.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const env = getEnv();
  const client = getClient();
  if (!client) {
    console.warn("[postmark] skipped (not configured):", params.subject, "→", params.to);
    return { ok: true, messageId: null, skipped: true, reason: "postmark_not_configured" };
  }
  const from = params.from ?? env.POSTMARK_FROM_EMAIL;
  if (!from) {
    console.warn("[postmark] skipped (no from address):", params.subject);
    return { ok: true, messageId: null, skipped: true, reason: "missing_from" };
  }

  const message: PostmarkMessage = {
    From: from,
    To: params.to,
    Subject: params.subject,
    TextBody: params.textBody,
    HtmlBody: params.htmlBody,
    ReplyTo: params.replyTo,
    MessageStream: params.messageStream ?? "outbound",
    Headers: params.headers
      ? Object.entries(params.headers).map(([Name, Value]) => ({ Name, Value }))
      : undefined,
    Attachments: params.attachments?.map((a) => ({
      Name: a.Name,
      Content: a.Content,
      ContentType: a.ContentType,
      ContentID: a.ContentID ?? null,
    })),
  };

  const result = await client.sendEmail(message);
  return { ok: true, messageId: result.MessageID };
}

/**
 * Build the unique reply-to address used to thread inbound emails back to a project.
 *   reply+<inboundKey>@<POSTMARK_REPLY_DOMAIN>
 */
export function buildReplyToAddress(inboundKey: string): string | null {
  const env = getEnv();
  if (!env.POSTMARK_REPLY_DOMAIN) return null;
  return `reply+${inboundKey}@${env.POSTMARK_REPLY_DOMAIN}`;
}
