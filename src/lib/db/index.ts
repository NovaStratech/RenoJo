import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * Drizzle client backed by `postgres` driver against Supabase Postgres.
 * Uses the transaction pooler URL (port 6543) — disable prepared statements.
 *
 * Server-only. Never import in client components.
 *
 * Lazy: the connection is opened on first use so Next.js can collect page data
 * during build without requiring DATABASE_URL.
 */

declare global {
  var __renojo_pg__: ReturnType<typeof postgres> | undefined;
  var __renojo_drizzle__: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function createDrizzle() {
  const env = getEnv();
  const client =
    globalThis.__renojo_pg__ ??
    postgres(env.DATABASE_URL, {
      prepare: false,
      max: 10,
      idle_timeout: 20,
    });
  if (process.env.NODE_ENV !== "production") {
    globalThis.__renojo_pg__ = client;
  }
  return drizzle(client, { schema });
}

function getDb() {
  if (!globalThis.__renojo_drizzle__) {
    globalThis.__renojo_drizzle__ = createDrizzle();
  }
  return globalThis.__renojo_drizzle__;
}

// Proxy: defers connection creation until a query is actually run.
export const db = new Proxy({} as ReturnType<typeof createDrizzle>, {
  get(_, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
}) as ReturnType<typeof createDrizzle>;

export type Database = typeof db;
export { schema };
