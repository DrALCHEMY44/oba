import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "@/i18n/navigation";
import { getAdminSession } from "@/lib/require-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, session] = await Promise.all([params, getAdminSession()]);
  if (process.env.DATABASE_URL && !session) redirect({ href: "/login", locale });
  return children;
}
