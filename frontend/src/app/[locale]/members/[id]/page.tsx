import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getMemberDetails } from "@/lib/public-data";
import { formatCalendarDate, formatDate, formatMoney } from "@/lib/format";
import { Notice, PageShell, StatCard } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";
import { ChargeStatusBadge } from "@/components/charge-status-badge";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, common, rota, locale, data] = await Promise.all([
    getTranslations("members"),
    getTranslations("common"),
    getTranslations("rota"),
    getLocale(),
    getMemberDetails(id),
  ]);
  if (data !== null && !data.member) notFound();
  const language = locale as "fr" | "en";
  return (
    <PageShell title={data?.member?.fullName ?? t("title")}>
      {data === null ? (
        <Notice>{common("databaseUnavailable")}</Notice>
      ) : (
        <>
          <div className="mb-6 flex items-center gap-3">
            <StatusBadge status={data.member!.status} />
            {!data.member!.isActive && (
              <span className="text-sm text-muted-foreground">{t("inactive")}</span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label={t("dues")}
              value={formatMoney(data.member!.duesOutstanding, language)}
            />
            <StatCard
              label={t("fines")}
              value={formatMoney(data.member!.finesOutstanding, language)}
            />
            <StatCard
              label={t("owed")}
              value={formatMoney(data.member!.outstandingAmount, language)}
            />
          </div>
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-semibold">{t("charges")}</h2>
            {data.charges.length === 0 ? (
              <Notice>{t("noCharges")}</Notice>
            ) : (
              <div className="space-y-3">
                {data.charges.map((charge) => (
                  <article key={charge.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex justify-between gap-3">
                      <h3 className="font-medium">
                        {charge.type === "fine"
                          ? (language === "fr" ? charge.reasonFr : charge.reasonEn) || charge.label
                          : charge.label}
                      </h3>
                      <strong>{formatMoney(charge.amount, language)}</strong>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("issued")}: {formatCalendarDate(charge.issuedOn, language)} · {t("due")}:{" "}
                      {formatCalendarDate(charge.dueDate, language)}
                    </p>
                    <div className="mt-2">
                      <ChargeStatusBadge
                        paid={charge.paidAmount}
                        outstanding={charge.outstandingAmount}
                        dueDate={charge.dueDate}
                      />
                    </div>
                    <p className="mt-1 text-sm">
                      {t("owed")}: {formatMoney(charge.outstandingAmount, language)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-semibold">{t("payments")}</h2>
            {data.payments.length === 0 ? (
              <Notice>{t("noPayments")}</Notice>
            ) : (
              <div className="space-y-3">
                {data.payments.map((payment) => (
                  <article
                    key={payment.id}
                    className="flex justify-between gap-3 rounded-xl border border-border bg-card p-4"
                  >
                    <div>
                      <div className="font-medium">
                        {t("receipt", { number: payment.receiptNumber })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(payment.paidAt, language)}
                      </div>
                    </div>
                    <strong>{formatMoney(payment.amount, language)}</strong>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-semibold">{t("duties")}</h2>
            {data.duties.length === 0 ? (
              <Notice>{t("noDuties")}</Notice>
            ) : (
              <div className="space-y-3">
                {data.duties.map((duty) => (
                  <div
                    key={duty.dutyDate}
                    className="flex justify-between rounded-xl border border-border bg-card p-4"
                  >
                    <span>{formatCalendarDate(duty.dutyDate, language)}</span>
                    <span>{rota(duty.status as "scheduled" | "done" | "missed" | "swapped")}</span>
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
