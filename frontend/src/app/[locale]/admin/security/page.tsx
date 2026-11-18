import { getTranslations } from "next-intl/server";
import { getAdminSession } from "@/lib/require-admin";
import { Notice, PageShell } from "@/components/page-shell";
import { TwoFactorSettings } from "@/components/two-factor-settings";

export default async function SecurityPage() {
  const [t, session] = await Promise.all([getTranslations("security"), getAdminSession()]);
  return (
    <PageShell title={t("title")} description={t("description")}>
      {process.env.DATABASE_URL ? (
        <TwoFactorSettings enabled={session?.user.twoFactorEnabled ?? false} />
      ) : (
        <Notice>{t("demoUnavailable")}</Notice>
      )}
    </PageShell>
  );
}
