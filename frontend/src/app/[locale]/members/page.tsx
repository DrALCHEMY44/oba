import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getMembers } from "@/lib/public-data";
import { formatMoney } from "@/lib/format";
import { Notice, PageShell } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";

export default async function MembersPage() {
  const [t, common, locale, members] = await Promise.all([
    getTranslations("members"),
    getTranslations("common"),
    getLocale(),
    getMembers(),
  ]);
  return (
    <PageShell title={t("title")} description={t("description")}>
      {members === null ? (
        <Notice>{common("databaseUnavailable")}</Notice>
      ) : members.length === 0 ? (
        <Notice>{t("noMembers")}</Notice>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.id}`}
              className="block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 break-words font-semibold">{member.fullName}</h2>
                <StatusBadge status={member.status} />
              </div>
              {!member.isActive && (
                <p className="mt-1 text-xs text-muted-foreground">{t("inactive")}</p>
              )}
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">{t("dues")}</dt>
                  <dd className="font-medium">
                    {formatMoney(member.duesOutstanding, locale as "fr" | "en")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("fines")}</dt>
                  <dd className="font-medium">
                    {formatMoney(member.finesOutstanding, locale as "fr" | "en")}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">{t("owed")}</span>
                <strong className="tabular-nums">
                  {formatMoney(member.outstandingAmount, locale as "fr" | "en")}
                </strong>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
