import { getLocale, getTranslations } from "next-intl/server";
import { getFineReasons, getFines, getMembers } from "@/lib/public-data";
import { getAdminSession } from "@/lib/require-admin";
import { Notice, PageShell } from "@/components/page-shell";
import { FineManager } from "@/components/fine-manager";

export default async function FinesPage() {
  const [t, common, locale, fines, members, reasons, session] = await Promise.all([
    getTranslations("fines"),
    getTranslations("common"),
    getLocale(),
    getFines(),
    getMembers(),
    getFineReasons(),
    getAdminSession(),
  ]);
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return (
    <PageShell title={t("title")} description={t("description")}>
      {fines === null || members === null || reasons === null ? (
        <Notice>{common("databaseUnavailable")}</Notice>
      ) : (
        <FineManager
          initialFines={fines}
          members={members.map(({ id, fullName, isActive }) => ({ id, fullName, isActive }))}
          reasons={reasons}
          locale={locale as "fr" | "en"}
          mode={!process.env.DATABASE_URL ? "demo" : session ? "live" : "readonly"}
          today={today}
        />
      )}
    </PageShell>
  );
}
