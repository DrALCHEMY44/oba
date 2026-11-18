import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getExpenseCategories, getExpenses } from "@/lib/public-data";
import { formatDate, formatMoney } from "@/lib/format";
import { Notice, PageShell } from "@/components/page-shell";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; category?: string; page?: string }>;
}) {
  const { month, category, page: rawPage } = await searchParams;
  const page = Math.min(Math.max(Number.parseInt(rawPage ?? "1", 10) || 1, 1), 5000);
  const [t, common, locale, categories, expenses] = await Promise.all([
    getTranslations("expenses"),
    getTranslations("common"),
    getLocale(),
    getExpenseCategories(),
    getExpenses({ month, categoryId: category, limit: 21, offset: (page - 1) * 20 }),
  ]);
  const language = locale as "fr" | "en";
  const pageUrl = (number: number) =>
    `/expenses?${new URLSearchParams({ ...(month ? { month } : {}), ...(category ? { category } : {}), page: String(number) })}`;
  return (
    <PageShell title={t("title")} description={t("description")}>
      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <label className="field min-w-0 max-w-full flex-[1_1_140px]">
          <span>{t("month")}</span>
          <input
            type="month"
            name="month"
            defaultValue={month ?? ""}
            className="w-full min-w-0 max-w-full"
          />
        </label>
        <label className="field min-w-0 max-w-full flex-[1_1_140px]">
          <span>{common("category")}</span>
          <select
            name="category"
            defaultValue={category ?? ""}
            className="w-full min-w-0 max-w-full"
          >
            <option value="">{t("allCategories")}</option>
            {categories?.map((item) => (
              <option key={item.id} value={item.id}>
                {language === "fr" ? item.nameFr : item.nameEn}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="action-button">
          {t("apply")}
        </button>
      </form>
      {expenses === null ? (
        <Notice>{common("databaseUnavailable")}</Notice>
      ) : expenses.length === 0 ? (
        <Notice>{t("noExpenses")}</Notice>
      ) : (
        <div className="space-y-3">
          {expenses.slice(0, 20).map((expense) => (
            <article
              key={expense.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="min-w-0 flex-1 break-words">
                <h2 className="font-medium">{expense.description}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {language === "fr" ? expense.categoryFr : expense.categoryEn} ·{" "}
                  {formatDate(expense.spentAt, language)}
                </p>
                {expense.receiptUrl && (
                  <a
                    href={expense.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-primary underline"
                  >
                    {t("receipt")}
                  </a>
                )}
              </div>
              <strong className="shrink-0 whitespace-nowrap text-sm tabular-nums">
                {formatMoney(expense.amount, language)}
              </strong>
            </article>
          ))}
          <nav
            aria-label={t("pages")}
            className="mt-6 flex justify-between gap-3 text-sm font-semibold"
          >
            <span>
              {page > 1 && (
                <Link href={pageUrl(page - 1)} className="text-primary hover:underline">
                  ← {t("previous")}
                </Link>
              )}
            </span>
            <span>
              {expenses.length > 20 && (
                <Link href={pageUrl(page + 1)} className="text-primary hover:underline">
                  {t("next")} →
                </Link>
              )}
            </span>
          </nav>
        </div>
      )}
    </PageShell>
  );
}
