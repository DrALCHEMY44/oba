import { getLocale, getTranslations } from "next-intl/server";
import { getRota } from "@/lib/public-data";
import { formatCalendarDate } from "@/lib/format";
import { Notice, PageShell } from "@/components/page-shell";

export default async function RotaPage() {
  const [t, common, locale, duties] = await Promise.all([
    getTranslations("rota"),
    getTranslations("common"),
    getLocale(),
    getRota(),
  ]);
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const language = locale as "fr" | "en";
  const next = duties
    ?.filter((duty) => duty.dutyDate >= today)
    .sort((a, b) => a.dutyDate.localeCompare(b.dutyDate))[0];
  return (
    <PageShell title={t("title")} description={t("description")}>
      {duties === null ? (
        <Notice>{common("databaseUnavailable")}</Notice>
      ) : duties.length === 0 ? (
        <Notice>{t("noDuties")}</Notice>
      ) : (
        <>
          {next && (
            <div className="mb-6 rounded-xl border-2 border-primary bg-card p-5">
              <div className="text-sm font-semibold text-primary">{t("nextDuty")}</div>
              <div className="mt-1 text-xl font-bold">{next.memberName}</div>
              <div className="text-sm text-muted-foreground">
                {formatCalendarDate(next.dutyDate, language)}
              </div>
            </div>
          )}
          <div className="space-y-3">
            {duties.map((duty) => (
              <article
                key={duty.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div>
                  <h2 className="font-medium">{duty.memberName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {formatCalendarDate(duty.dutyDate, language)}
                    {duty.swappedWith && ` · ${t("swappedWith", { name: duty.swappedWith })}`}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                  {t(duty.status as "scheduled" | "done" | "missed" | "swapped")}
                </span>
              </article>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
