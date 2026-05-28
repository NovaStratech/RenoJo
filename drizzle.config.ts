import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  // Allow drizzle-kit to be loaded without crashing; commands that need it will fail clearly.
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://invalid",
  },
  strict: true,
  verbose: true,
});
