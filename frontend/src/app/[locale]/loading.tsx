import { getTranslations } from "next-intl/server";
import { LoaderCircle } from "lucide-react";

export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <main id="main-content" aria-busy="true" className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
      <p role="status" className="flex items-center gap-3 text-sm text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
        {t("loading")}
      </p>
    </main>
  );
}
