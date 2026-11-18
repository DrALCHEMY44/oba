import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/require-admin";
import { LoginForm } from "@/components/login-form";
import { Notice } from "@/components/page-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function LoginPage() {
  const [t, locale, session] = await Promise.all([
    getTranslations("login"),
    getLocale(),
    getAdminSession(),
  ]);
  if (session) redirect({ href: "/admin", locale });
  return (
    <main id="main-content" className="mx-auto max-w-lg px-4 py-10 sm:px-8 sm:py-16">
      <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
        <LockKeyhole className="size-6" aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("description")}</p>
      <div className="mt-7 rounded-xl border border-border bg-card p-6 sm:p-8">
        {auth ? (
          <LoginForm />
        ) : (
          <div className="space-y-4">
            <Notice>{t("demoNotice")}</Notice>
            <Link href="/admin" className="action-button w-full">
              {t("openDemo")}
            </Link>
          </div>
        )}
      </div>
      <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">{t("publicNote")}</p>
    </main>
  );
}
