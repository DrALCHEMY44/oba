import { getTranslations } from "next-intl/server";

export async function StatusBadge({ status }: { status: "up_to_date" | "partial" | "overdue" }) {
  const t = await getTranslations("status");
  const color =
    status === "overdue"
      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
      : status === "partial"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
        : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200";
  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}
    >
      {t(status)}
    </span>
  );
}
