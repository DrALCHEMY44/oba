import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
      <h1 className="text-2xl font-bold">{t("notFound")}</h1>
      <Link href="/" className="action-button mt-6">
        {t("backHome")}
      </Link>
    </main>
  );
}
