"use client";

import { useTranslations } from "next-intl";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations("common");
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
      <h1 className="text-2xl font-bold">{t("errorTitle")}</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        {t("errorDescription")}
      </p>
      <button type="button" onClick={reset} className="action-button mt-6">
        {t("retry")}
      </button>
    </main>
  );
}
