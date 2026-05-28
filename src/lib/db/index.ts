import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * Drizzle client backed by `postgres` driver against Supabase Postgres.
 * Uses the transaction pooler URL (port 6543) — disable prepared statements.
 *
 * Server-only. Never import in client components.
 */

declare global {
  var __renojo_pg__: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  const env = getEnv();
  return postgres(env.DATABASE_URL, {
    prepare: false, // required for pgbouncer transaction mode
    max: 10,
    idle_timeout: 20,
  });
}

const client = globalThis.__renojo_pg__ ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalThis.__renojo_pg__ = client;
}

export const db = drizzle(client, { schema });
export type Database = typeof db;
export { schema };
