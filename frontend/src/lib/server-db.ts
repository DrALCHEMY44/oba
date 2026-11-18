import "server-only";

// Server actions import through this boundary; client components never import database code.
export { getDb } from "@oba/backend/db";
export * as schema from "@oba/backend/schema";
