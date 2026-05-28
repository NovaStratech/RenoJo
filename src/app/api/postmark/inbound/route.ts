import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/env";
import { db } from "@/lib/db";
import {
  projects,
  messages,
  messageAttachments,
} from "@/lib/db/schema";
import { BUCKETS, randomFilename, uploadToBucket } from "@/lib/storage";

/**
 * Postmark inbound webhook.
 * Configure in Postmark with: https://<APP_URL>/api/postmark/inbound?token=<POSTMARK_INBOUND_WEBHOOK_TOKEN>
 *
 * We expect the recipient to be reply+<inboundKey>@<reply-domain>.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostmarkRecipient = { Email?: string; MailboxHash?: string; Name?: string };
type PostmarkAttachment = {
  Name: string;
  Content: string; // base64
  ContentType: string;
  ContentLength?: number;
};
type PostmarkInbound = {
  From?: string;
  FromFull?: { Email?: string; Name?: string };
  To?: string;
  ToFull?: PostmarkRecipient[];
  OriginalRecipient?: string;
  Subject?: string;
  MessageID?: string;
  TextBody?: string;
  HtmlBody?: string;
  StrippedTextReply?: string;
  Headers?: { Name: string; Value: string }[];
  Attachments?: PostmarkAttachment[];
};

const INBOUND_KEY_RE = /reply\+([A-Za-z0-9_-]{4,64})@/i;

function extractInboundKey(body: PostmarkInbound): string | null {
  const candidates: string[] = [];
  if (body.OriginalRecipient) candidates.push(body.OriginalRecipient);
  if (body.To) candidates.push(body.To);
  for (const r of body.ToFull ?? []) {
    if (r.Email) candidates.push(r.Email);
    if (r.MailboxHash && r.Email) {
      candidates.push(`reply+${r.MailboxHash}@${r.Email.split("@")[1] ?? ""}`);
    }
  }
  for (const c of candidates) {
    const m = c.match(INBOUND_KEY_RE);
    if (m) return m[1];
  }
  return null;
}

function findHeader(headers: PostmarkInbound["Headers"], name: string) {
  if (!headers) return undefined;
  const lower = name.toLowerCase();
  return headers.find((h) => h.Name.toLowerCase() === lower)?.Value;
}

export async function POST(req: NextRequest) {
  const env = getEnv();

  // Auth: shared secret in query string
  if (env.POSTMARK_INBOUND_WEBHOOK_TOKEN) {
    const token = req.nextUrl.searchParams.get("token");
    if (token !== env.POSTMARK_INBOUND_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let body: PostmarkInbound;
  try {
    body = (await req.json()) as PostmarkInbound;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const inboundKey = extractInboundKey(body);
  if (!inboundKey) {
    return NextResponse.json(
      { error: "no_inbound_key", to: body.To, original: body.OriginalRecipient },
      { status: 202 },
    );
  }

  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.inboundKey, inboundKey))
    .limit(1);
  const project = projectRows[0];
  if (!project) {
    // 202 so Postmark doesn't keep retrying for an unknown key
    return NextResponse.json({ error: "project_not_found" }, { status: 202 });
  }

  const fromEmail = body.FromFull?.Email ?? body.From ?? null;
  const toEmail = body.OriginalRecipient ?? body.To ?? null;
  const subject = body.Subject ?? null;
  const text = body.StrippedTextReply || body.TextBody || "";
  const html = body.HtmlBody ?? null;
  const messageId = body.MessageID ?? null;
  const inReplyTo = findHeader(body.Headers, "In-Reply-To") ?? null;
  const references = findHeader(body.Headers, "References") ?? null;

  const [inserted] = await db
    .insert(messages)
    .values({
      projectId: project.id,
      direction: "inbound",
      channel: "email",
      senderType: "client",
      fromEmail,
      toEmail,
      subject,
      bodyText: text,
      bodyHtml: html,
      postmarkMessageId: messageId,
      inReplyTo,
      referencesHeader: references,
    })
    .returning({ id: messages.id });

  // Attachments
  for (const att of body.Attachments ?? []) {
    try {
      const path = `${project.id}/${inserted.id}/${randomFilename(att.Name)}`;
      const buffer = Buffer.from(att.Content, "base64");
      await uploadToBucket(
        BUCKETS.messageAttachments,
        path,
        buffer,
        att.ContentType,
      );
      await db.insert(messageAttachments).values({
        messageId: inserted.id,
        storagePath: path,
        filename: att.Name,
        mimeType: att.ContentType,
        sizeBytes: att.ContentLength ?? buffer.byteLength,
      });
    } catch (e) {
      console.error("[inbound] attachment failed", att.Name, e);
    }
  }

  return NextResponse.json({ ok: true, messageId: inserted.id });
}
