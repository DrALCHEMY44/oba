import { getTranslations } from "next-intl/server";

export async function ChargeStatusBadge({
  paid,
  outstanding,
  dueDate,
}: {
  paid: number;
  outstanding: number;
  dueDate: string;
}) {
  const t = await getTranslations("status");
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const status =
    outstanding === 0 ? "paid" : dueDate < today ? "overdue" : paid > 0 ? "partial" : "unpaid";
  const color =
    status === "overdue"
      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
      : status === "partial"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
        : status === "paid"
          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
          : "bg-muted text-foreground";
  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}
    >
      {t(status)}
    </span>
  );
}
