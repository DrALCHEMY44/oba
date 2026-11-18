import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";
import { isTreasurerSession } from "./admin-access";

export async function getAdminSession() {
  if (!auth) return null;
  const session = await auth.api.getSession({ headers: await headers() });
  return isTreasurerSession(session) ? session : null;
}

// Every financial write action must call this before validation or database access.
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}
