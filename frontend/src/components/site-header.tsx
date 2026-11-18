"use client";

import { useTranslations } from "next-intl";
import {
  BadgeAlert,
  ChartNoAxesCombined,
  LayoutDashboard,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Shirt,
  Users,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";

const links = [
  { href: "/", key: "dashboard", icon: LayoutDashboard },
  { href: "/members", key: "members", icon: Users },
  { href: "/expenses", key: "expenses", icon: ReceiptText },
  { href: "/fines", key: "fines", icon: BadgeAlert },
  { href: "/rota", key: "rota", icon: Shirt },
  { href: "/summary", key: "summary", icon: ChartNoAxesCombined },
] as const;

function BasketballMark() {
  return (
    <svg viewBox="0 0 40 40" className="size-10 shrink-0" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#EF9448" />
      <path
        d="M2 20h36M20 2v36M7 7c12 8 12 18 0 26M33 7c-12 8-12 18 0 26"
        fill="none"
        stroke="#102C46"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-50 rounded bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t("skipToContent")}
      </a>
      <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#102C46] px-5 py-7 text-white lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <BasketballMark />
          <div>
            <div className="text-[15px] font-bold leading-snug">{t("brand")}</div>
            <div className="mt-1 text-xs text-[#B4C9DB]">{t("brandCaption")}</div>
          </div>
        </Link>
        <nav aria-label={t("mainNavigation")} className="mt-10 space-y-2">
          {links.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-lg px-4 text-sm font-medium transition-colors ${active(href) ? "bg-[#215FC2] text-white" : "text-[#C7D8E8] hover:bg-white/10 hover:text-white"}`}
            >
              <Icon className="size-[19px]" aria-hidden="true" />
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-8">
          <div className="mb-5 flex items-center gap-2 px-3 text-xs text-[#B4C9DB]">
            <ShieldCheck className="size-4" aria-hidden="true" />
            {t("publicAccess")}
          </div>
          <Link
            href="/admin"
            className="flex min-h-12 items-center gap-3 rounded-lg border border-white/20 px-4 text-sm font-medium hover:bg-white/10"
          >
            <LockKeyhole className="size-[18px]" aria-hidden="true" />
            {t("admin")}
          </Link>
          <p className="mt-5 px-3 text-xs text-[#B4C9DB]">{t("currency")}</p>
        </div>
      </aside>
      <header className="border-b border-border bg-card lg:ml-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 lg:hidden">
            <BasketballMark />
            <span className="max-w-40 text-sm font-bold leading-snug">{t("brand")}</span>
          </Link>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            {t("publicAccess")}
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
            <Link
              href="/admin"
              aria-label={t("admin")}
              className="flex size-11 items-center justify-center rounded-md border border-border lg:hidden"
            >
              <LockKeyhole className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <nav
          aria-label={t("mainNavigation")}
          className="grid grid-cols-3 border-t border-border px-2 py-1 lg:hidden"
        >
          {links.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-md px-1.5 text-center text-xs font-semibold ${active(href) ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span>{t(key)}</span>
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
