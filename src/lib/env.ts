import { z } from "zod";

/**
 * Centralized validated environment variables.
 * Import from `@/lib/env` in server code only (this throws if required vars are missing).
 * For client code, only `NEXT_PUBLIC_*` vars are accessible.
 */

/**
 * Optional email var that never crashes the app: trims the value and silently
 * drops it (→ undefined) when empty or not a valid email. This avoids taking the
 * whole portal down because of a stray space / quote in a Vercel env var.
 */
const optionalEmail = z.preprocess((v) => {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return undefined;
  return z.string().email().safeParse(trimmed).success ? trimmed : undefined;
}, z.string().email().optional());

/** Trim surrounding whitespace / newlines / quotes from a secret or URL.
 *  Vercel env values sometimes carry a trailing "\n" which breaks HTTP headers. */
const trimmed = (schema: z.ZodTypeAny) =>
  z.preprocess((v) => {
    if (typeof v !== "string") return v;
    const t = v.trim().replace(/^["']|["']$/g, "");
    return t === "" ? undefined : t;
  }, schema);

const serverSchema = z.object({
  APP_URL: z.string().url(),
  TOKEN_SECRET: z.string().min(32, "TOKEN_SECRET must be at least 32 characters"),

  // Supabase (server side)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),

  // Resend (email)
  RESEND_API_KEY: trimmed(z.string().min(1).optional()),
  RESEND_FROM_EMAIL: optionalEmail,
  OWNER_EMAIL: optionalEmail,

  // OpenAI (or GitHub Models — set OPENAI_BASE_URL=https://models.github.ai/inference and OPENAI_API_KEY=<github_pat>)
  OPENAI_API_KEY: trimmed(z.string().min(1).optional()),
  OPENAI_BASE_URL: trimmed(z.string().url().optional()),
  OPENAI_MODEL_TEXT: trimmed(z.string()).pipe(z.string()).default("gpt-4o-mini"),
  OPENAI_MODEL_VISION: trimmed(z.string()).pipe(z.string()).default("gpt-4o"),
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
