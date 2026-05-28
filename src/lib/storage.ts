import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { randomBytes } from "node:crypto";

export const BUCKETS = {
  projectPhotos: "project-photos",
  quotePdfs: "quote-pdfs",
  messageAttachments: "message-attachments",
  companyAssets: "company-assets",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

export function randomFilename(originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  const ext = dot >= 0 ? originalName.slice(dot).toLowerCase() : "";
  const id = randomBytes(12).toString("hex");
  return `${id}${ext}`;
}

/**
 * Upload a binary blob to a private Supabase Storage bucket using the
 * service-role key. Returns the storage path.
 */
export async function uploadToBucket(
  bucket: BucketName,
  path: string,
  body: Blob | Buffer | ArrayBuffer,
  contentType?: string,
): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
  return path;
}

/** Create a short-lived signed URL for a private object. */
export async function createSignedUrl(
  bucket: BucketName,
  path: string,
  expiresInSec = 60 * 60,
): Promise<string | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSec);
  if (error || !data) return null;
  return data.signedUrl;
}
