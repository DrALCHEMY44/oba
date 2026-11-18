import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageShell, StatCard } from "@/components/page-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { getFinanceTotals } from "@/lib/public-data";
import { formatMoney } from "@/lib/format";

export default async function AdminPage() {
  const [t, nav, dash, locale, totals] = await Promise.all([
    getTranslations("admin"),
    getTranslations("nav"),
    getTranslations("dashboard"),
    getLocale(),
    getFinanceTotals(),
  ]);
  const language = locale as "fr" | "en";
  const demo = !process.env.DATABASE_URL;
  return (
    <PageShell title={t("title")} description={t("description")}>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
          {demo ? t("demoBadge") : t("protected")}
        </span>
        {!demo && <SignOutButton />}
      </div>
      {demo && (
        <p className="mb-5 rounded-xl border border-amber-400/40 bg-amber-100 p-4 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          {t("demoNotice")}
        </p>
      )}
      {totals && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label={dash("balance")} value={formatMoney(totals.balance, language)} />
          <StatCard
            label={dash("collected")}
            value={formatMoney(totals.totalCollected, language)}
          />
          <StatCard
            label={dash("outstanding")}
            value={formatMoney(totals.totalOutstanding, language)}
          />
        </div>
      )}
      <Link href="/admin/records" className="action-button mt-7">
        {t("manage")}
      </Link>
      <section className="mt-8">
        <h2 className="mb-4 font-semibold">{t("records")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["members", "payments", "expenses", "fines", "rota", "summary"] as const).map(
            (module) => (
              <Link
                key={module}
                href={`/${module}`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 font-medium hover:bg-muted"
              >
                {nav(module)}
                <ArrowUpRight className="size-4 text-primary" aria-hidden="true" />
              </Link>
            ),
          )}
        </div>
      </section>
      {!demo && (
        <Link
          href="/admin/security"
          className="mt-7 flex items-start gap-3 rounded-xl border border-border bg-card p-5 hover:bg-muted"
        >
          <LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">{t("security")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("securityDescription")}</p>
          </div>
        </Link>
      )}
    </PageShell>
  );
}
