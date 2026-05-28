import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  // Allow drizzle-kit to be loaded without crashing; commands that need it will fail clearly.
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  // Output migrations into Supabase's expected folder so the Supabase GitHub
  // integration applies them automatically on merge to main.
  out: "./supabase/migrations",
  dialect: "postgresql",
  // Use Supabase-compatible filename format: <YYYYMMDDHHmmss>_<name>.sql
  migrations: {
    prefix: "supabase",
  },
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://invalid",
  },
  strict: true,
  verbose: true,
});
