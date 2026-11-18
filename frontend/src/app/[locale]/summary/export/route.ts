import { getTranslations } from "next-intl/server";
import { getExpensesByCategory, getFinanceTotals, getMonthlyCashFlow } from "@/lib/public-data";

function cell(value: string | number) {
  const text = String(value);
  const safe = /^[=+@-]/.test(text) && typeof value === "string" ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "fr" && locale !== "en") return new Response(null, { status: 404 });
  const [t, dash, common, totals, months, categories] = await Promise.all([
    getTranslations({ locale, namespace: "summary" }),
    getTranslations({ locale, namespace: "dashboard" }),
    getTranslations({ locale, namespace: "common" }),
    getFinanceTotals(),
    getMonthlyCashFlow(),
    getExpensesByCategory(),
  ]);
  if (!totals || !months || !categories)
    return new Response(common("databaseUnavailable"), { status: 503 });
  const lines = [
    [t("title"), common("amount")],
    [dash("collected"), totals.totalCollected],
    [t("duesCollected"), totals.duesCollected],
    [t("finesCollected"), totals.finesCollected],
    [dash("spent"), totals.totalSpent],
    [dash("outstanding"), totals.totalOutstanding],
    [dash("balance"), totals.balance],
    [],
    [t("monthly"), dash("collected"), dash("spent")],
    ...months.map((item) => [item.month, item.collected, item.spent]),
    [],
    [t("categories"), common("amount")],
    ...categories.map((item) => [locale === "fr" ? item.nameFr : item.nameEn, item.totalSpent]),
  ];
  const csv = "\uFEFF" + lines.map((line) => line.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="association-summary-${locale}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
