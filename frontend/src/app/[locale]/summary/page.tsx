import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  getExpensesByCategory,
  getFinanceTotals,
  getMonthlyCashFlow,
  getMembers,
} from "@/lib/public-data";
import { formatMoney, formatMonth } from "@/lib/format";
import { Notice, PageShell, StatCard } from "@/components/page-shell";
import { SummaryCharts } from "@/components/summary-charts";
import { PrintButton } from "@/components/print-button";

export default async function SummaryPage() {
  const [t, common, dash, statusText, locale, totals, months, categories, members] =
    await Promise.all([
      getTranslations("summary"),
      getTranslations("common"),
      getTranslations("dashboard"),
      getTranslations("status"),
      getLocale(),
      getFinanceTotals(),
      getMonthlyCashFlow(),
      getExpensesByCategory(),
      getMembers(),
    ]);
  const language = locale as "fr" | "en";
  return (
    <PageShell title={t("title")} description={t("description")}>
      {totals === null || months === null || categories === null || members === null ? (
        <Notice>{common("databaseUnavailable")}</Notice>
      ) : (
        <>
          <div className="no-print mb-6 flex flex-wrap gap-3">
            <a
              href={`/${language}/summary/export`}
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground hover:opacity-90"
            >
              {t("exportCsv")}
            </a>
            <PrintButton label={t("print")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/payments"
              className="block rounded-xl focus-visible:outline-2 focus-visible:outline-ring [&>div]:h-full hover:[&>div]:border-primary/50"
              aria-label={`${dash("collected")}: ${formatMoney(totals.totalCollected, language)}. ${common("viewAll")}`}
            >
              <StatCard
                label={dash("collected")}
                value={formatMoney(totals.totalCollected, language)}
              />
            </Link>
            <StatCard
              label={t("duesCollected")}
              value={formatMoney(totals.duesCollected, language)}
            />
            <StatCard
              label={t("finesCollected")}
              value={formatMoney(totals.finesCollected, language)}
            />
            <Link
              href="/expenses"
              className="block rounded-xl focus-visible:outline-2 focus-visible:outline-ring [&>div]:h-full hover:[&>div]:border-primary/50"
              aria-label={`${dash("spent")}: ${formatMoney(totals.totalSpent, language)}. ${common("viewAll")}`}
            >
              <StatCard label={dash("spent")} value={formatMoney(totals.totalSpent, language)} />
            </Link>
            <StatCard
              label={dash("outstanding")}
              value={formatMoney(totals.totalOutstanding, language)}
            />
            <StatCard label={dash("balance")} value={formatMoney(totals.balance, language)} />
          </div>
          <section className="mt-8">
            {months.length === 0 ? (
              <Notice>{t("noMonths")}</Notice>
            ) : (
              <SummaryCharts
                months={months}
                categories={categories
                  .filter((item) => item.totalSpent > 0)
                  .map((item) => ({
                    name: language === "fr" ? item.nameFr : item.nameEn,
                    totalSpent: item.totalSpent,
                  }))}
                collectedLabel={dash("collected")}
                spentLabel={dash("spent")}
                monthlyTitle={t("monthly")}
                categoriesTitle={t("categories")}
                noCategories={t("noCategories")}
                balanceTitle={t("balanceTrend")}
                statusTitle={t("memberStatus")}
                statuses={(
                  [
                    ["up_to_date", "var(--chart-2)"],
                    ["partial", "var(--chart-5)"],
                    ["overdue", "var(--chart-4)"],
                  ] as const
                ).map(([status, color]) => ({
                  name: statusText(status),
                  count: members.filter((member) => member.status === status).length,
                  color,
                }))}
                locale={language}
              />
            )}
          </section>
          {months.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 font-semibold">{t("monthly")}</h2>
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">
                        {common("date")}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        {dash("collected")}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        {dash("spent")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {months.map((month) => (
                      <tr key={month.month}>
                        <th scope="row" className="whitespace-nowrap px-4 py-3 font-medium">
                          {formatMonth(month.month, language)}
                        </th>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                          {formatMoney(month.collected, language)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                          {formatMoney(month.spent, language)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-semibold">{t("categories")}</h2>
            {categories.every((item) => item.totalSpent === 0) ? (
              <Notice>{t("noCategories")}</Notice>
            ) : (
              <div className="space-y-2">
                {categories
                  .filter((item) => item.totalSpent > 0)
                  .map((item) => (
                    <div
                      key={item.categoryId}
                      className="flex justify-between gap-3 border-b border-border py-2"
                    >
                      <span>{language === "fr" ? item.nameFr : item.nameEn}</span>
                      <strong>{formatMoney(item.totalSpent, language)}</strong>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}
