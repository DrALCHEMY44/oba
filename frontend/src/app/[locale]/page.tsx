import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, Shirt, Users, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getExpenses, getFinanceTotals, getRota } from "@/lib/public-data";
import { formatCalendarDate, formatDate, formatMoney } from "@/lib/format";
import { Notice, PageShell, StatCard } from "@/components/page-shell";

export default async function HomePage() {
  const [t, common, locale, totals, recentExpenses, duties] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("common"),
    getLocale(),
    getFinanceTotals(),
    getExpenses({ limit: 5 }),
    getRota(),
  ]);
  const language = locale as "fr" | "en";
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const nextDuty = duties
    ?.filter(
      (duty) =>
        duty.dutyDate >= today && (duty.status === "scheduled" || duty.status === "swapped"),
    )
    .sort((a, b) => a.dutyDate.localeCompare(b.dutyDate))[0];
  const amount = (value: number | undefined) =>
    value === undefined ? "—" : formatMoney(value, language);
  return (
    <PageShell title={t("title")} description={t("description")}>
      {totals === null && (
        <div className="mb-5">
          <Notice>{common("databaseUnavailable")}</Notice>
        </div>
      )}
      <div className="balance-panel rounded-2xl px-6 py-7 sm:px-8">
        <div className="relative z-10 flex items-center gap-2.5 text-sm font-medium text-[#C6D8E8]">
          <Wallet className="size-[18px]" aria-hidden="true" />
          {t("balance")}
        </div>
        <div
          data-slot="balance-value"
          className="relative z-10 mt-4 break-words text-[clamp(1.6rem,7vw,3rem)] font-semibold tracking-tight tabular-nums"
          aria-label={totals === null ? common("notAvailable") : undefined}
        >
          {amount(totals?.balance)}
        </div>
        <p className="relative z-10 mt-4 text-xs text-[#B4C9DB] sm:text-sm">{t("balanceHint")}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link
          href="/payments"
          aria-label={`${t("collected")}: ${amount(totals?.totalCollected)}. ${common("viewAll")}`}
          className="block rounded-xl focus-visible:outline-2 focus-visible:outline-ring [&>div]:h-full hover:[&>div]:border-primary/50"
        >
          <StatCard label={t("collected")} value={amount(totals?.totalCollected)} />
        </Link>
        <Link
          href="/expenses"
          aria-label={`${t("spent")}: ${amount(totals?.totalSpent)}. ${common("viewAll")}`}
          className="block rounded-xl focus-visible:outline-2 focus-visible:outline-ring [&>div]:h-full hover:[&>div]:border-primary/50"
        >
          <StatCard label={t("spent")} value={amount(totals?.totalSpent)} />
        </Link>
        <StatCard
          label={t("outstanding")}
          value={amount(totals?.totalOutstanding)}
          className="col-span-2 sm:col-span-1"
        />
      </div>
      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-5">
            <h2 className="font-semibold">{t("recentExpenses")}</h2>
            <Link
              href="/expenses"
              className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary"
            >
              {common("viewAll")}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          {!recentExpenses?.length ? (
            <p className="px-5 py-10 text-sm text-muted-foreground">
              {totals === null ? common("notAvailable") : t("noExpenses")}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {recentExpenses.map((expense) => (
                <article
                  key={expense.id}
                  className="flex items-start justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium">{expense.description}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {language === "fr" ? expense.categoryFr : expense.categoryEn}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(expense.spentAt, language)}
                    </p>
                  </div>
                  <strong className="shrink-0 text-sm tabular-nums">
                    {formatMoney(expense.amount, language)}
                  </strong>
                </article>
              ))}
            </div>
          )}
        </section>
        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Shirt className="size-[18px] text-primary" aria-hidden="true" />
              <h2>{t("nextDuty")}</h2>
            </div>
            {nextDuty ? (
              <div className="my-5">
                <p className="text-xl font-semibold">
                  {nextDuty.swappedWith ?? nextDuty.memberName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatCalendarDate(nextDuty.dutyDate, language)}
                </p>
              </div>
            ) : (
              <p className="my-5 text-sm leading-6 text-muted-foreground">
                {duties === null ? common("notAvailable") : t("noDuty")}
              </p>
            )}
            <Link
              href="/rota"
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"
            >
              {t("viewRota")}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </section>
          <Link
            href="/members"
            className="group flex items-start gap-3 rounded-xl border border-border bg-secondary/50 p-5 hover:bg-secondary"
          >
            <Users className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold">{t("memberRecords")}</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {t("memberRecordsDescription")}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                {t("viewMembers")}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
            </div>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
