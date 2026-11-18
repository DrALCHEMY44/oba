"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("controls");
  return (
    <nav
      aria-label={t("language")}
      className="flex items-center gap-1 rounded-md border border-border p-1"
    >
      {(["fr", "en"] as const).map((option) => (
        <a
          key={option}
          href={`/${option}${pathname === "/" ? "" : pathname}`}
          hrefLang={option}
          aria-current={locale === option ? "page" : undefined}
          className={`min-h-11 min-w-11 rounded px-3 py-2 text-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring ${locale === option ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          {option.toUpperCase()}
        </a>
      ))}
    </nav>
  );
}
