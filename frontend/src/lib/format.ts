import type { Locale } from "@/i18n/locale";

export function formatMoney(amount: number, locale: Locale) {
  const number = new Intl.NumberFormat(locale === "fr" ? "fr-CM" : "en-US", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${number} FCFA`;
}

export function formatDate(value: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CM" : "en-GB", {
    dateStyle: "medium",
    timeZone: "Africa/Douala",
  }).format(value);
}

export function formatCalendarDate(value: string, locale: Locale) {
  return formatDate(new Date(`${value}T12:00:00Z`), locale);
}

export function formatMonth(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CM" : "en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "Africa/Douala",
  }).format(new Date(`${value}T12:00:00Z`));
}
