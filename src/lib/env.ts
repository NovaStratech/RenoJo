import { z } from "zod";

/**
 * Centralized validated environment variables.
 * Import from `@/lib/env` in server code only (this throws if required vars are missing).
 * For client code, only `NEXT_PUBLIC_*` vars are accessible.
 */

const serverSchema = z.object({
  APP_URL: z.string().url(),
  TOKEN_SECRET: z.string().min(32, "TOKEN_SECRET must be at least 32 characters"),

  // Supabase (server side)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),

  // Postmark
  POSTMARK_SERVER_TOKEN: z.string().min(1).optional(),
  POSTMARK_FROM_EMAIL: z.string().email().optional(),
  POSTMARK_REPLY_DOMAIN: z.string().min(1).optional(),
  POSTMARK_INBOUND_WEBHOOK_TOKEN: z.string().min(1).optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL_TEXT: z.string().default("gpt-4o-mini"),
  OPENAI_MODEL_VISION: z.string().default("gpt-4o"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const publicEnv = {
  APP_URL: process.env.APP_URL ?? "http://localhost:3000",
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;
