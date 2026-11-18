import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as financeSchema from "./schema";
import * as authSchema from "./auth-schema";

const schema = { ...financeSchema, ...authSchema };

// The pool is created lazily so static pages and build checks need no database secret.
let pool: Pool | undefined;
neonConfig.webSocketConstructor = ws;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for database operations");
  pool ??= new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 30_000 });
  return drizzle(pool, { schema });
}

export async function closeDb() {
  await pool?.end();
  pool = undefined;
}
