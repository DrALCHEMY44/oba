import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPayments } from "@/lib/public-data";
import { formatDate, formatMoney } from "@/lib/format";
import { Notice, PageShell } from "@/components/page-shell";

const pageNumber = (value?: string) =>
  Math.min(Math.max(Number.parseInt(value ?? "1", 10) || 1, 1), 5000);
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: rawPage } = await searchParams;
  const page = pageNumber(rawPage);
  const [t, membersText, common, locale, rows] = await Promise.all([
    getTranslations("payments"),
    getTranslations("members"),
    getTranslations("common"),
    getLocale(),
    getPayments({ limit: 21, offset: (page - 1) * 20 }),
  ]);
  const language = locale as "fr" | "en";
  const payments = rows?.slice(0, 20);
  return (
    <PageShell title={t("title")} description={t("description")}>
      <Link
        href="/"
        className="mb-5 inline-block text-sm font-semibold text-primary hover:underline"
      >
        ← {t("back")}
      </Link>
      {rows === null ? (
        <Notice>{common("databaseUnavailable")}</Notice>
      ) : payments?.length === 0 ? (
        <Notice>{t("none")}</Notice>
      ) : (
        <>
          <div className="space-y-3">
            {payments?.map((payment) => (
              <article
                key={payment.id}
                className="rounded-xl border border-border bg-card p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">
                      {membersText("receipt", { number: payment.receiptNumber })}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <Link
                        href={`/members/${payment.memberId}`}
                        className="text-primary hover:underline"
                      >
                        {payment.memberName}
                      </Link>{" "}
                      · {formatDate(payment.paidAt, language)}
                    </p>
                  </div>
                  <strong className="text-lg tabular-nums">
                    {formatMoney(payment.amount, language)}
                  </strong>
                </div>
                <div className="mt-4 border-t border-border pt-3 text-sm">
                  <h3 className="mb-2 font-medium">{t("appliedTo")}</h3>
                  {payment.allocations.length ? (
                    <ul className="space-y-1">
                      {payment.allocations.map((allocation, index) => (
                        <li key={index} className="flex justify-between gap-3">
                          <span>
                            {allocation.label}{" "}
                            <span className="text-muted-foreground">
                              ({allocation.type === "fine" ? t("fine") : t("dues")})
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {formatMoney(allocation.amount, language)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">{t("noAllocations")}</p>
                  )}
                  {payment.unallocated > 0 && (
                    <p className="mt-2 flex justify-between gap-3 font-medium">
                      <span>{t("unallocated")}</span>
                      <span>{formatMoney(payment.unallocated, language)}</span>
                    </p>
                  )}
                  {payment.notes && <p className="mt-3 text-muted-foreground">{payment.notes}</p>}
                </div>
              </article>
            ))}
          </div>
          <nav
            aria-label={t("pages")}
            className="mt-6 flex justify-between gap-3 text-sm font-semibold"
          >
            <span>
              {page > 1 && (
                <Link href={`/payments?page=${page - 1}`} className="text-primary hover:underline">
                  ← {t("previous")}
                </Link>
              )}
            </span>
            <span>
              {rows.length > 20 && (
                <Link href={`/payments?page=${page + 1}`} className="text-primary hover:underline">
                  {t("next")} →
                </Link>
              )}
            </span>
          </nav>
        </>
      )}
    </PageShell>
  );
}
