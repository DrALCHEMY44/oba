"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMonth, formatMoney } from "@/lib/format";

type Month = { month: string; collected: number; spent: number };
type Category = { name: string; totalSpent: number };
type Status = { name: string; count: number; color: string };

export function SummaryCharts({
  months,
  categories,
  statuses,
  collectedLabel,
  spentLabel,
  monthlyTitle,
  categoriesTitle,
  balanceTitle,
  statusTitle,
  noCategories,
  locale,
}: {
  months: Month[];
  categories: Category[];
  statuses: Status[];
  collectedLabel: string;
  spentLabel: string;
  monthlyTitle: string;
  categoriesTitle: string;
  balanceTitle: string;
  statusTitle: string;
  noCategories: string;
  locale: "fr" | "en";
}) {
  const [range, setRange] = useState<3 | 6 | 12 | 0>(0);
  const compact = new Intl.NumberFormat(locale === "fr" ? "fr-CM" : "en-GB", {
    notation: "compact",
  });
  const series = useMemo(
    () =>
      months.reduce<(Month & { balance: number })[]>(
        (items, item) => [
          ...items,
          { ...item, balance: (items.at(-1)?.balance ?? 0) + item.collected - item.spent },
        ],
        [],
      ),
    [months],
  );
  const visible = range ? series.slice(-range) : series;
  const tooltipStyle = {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
    borderRadius: 10,
    fontSize: 12,
    boxShadow: "0 12px 30px #0002",
  };
  const money = (value: unknown) => formatMoney(Number(value), locale);
  const axis = { fill: "var(--muted-foreground)", fontSize: 11 };
  const rangeLabels =
    locale === "fr"
      ? ["3 mois", "6 mois", "12 mois", "Tout"]
      : ["3 months", "6 months", "12 months", "All"];
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">{balanceTitle}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {locale === "fr"
                ? "Recettes moins dépenses, cumulées par mois"
                : "Income less spending, accumulated by month"}
            </p>
          </div>
          <div
            className="flex rounded-lg bg-muted p-1"
            aria-label={locale === "fr" ? "Période" : "Period"}
          >
            {([3, 6, 12, 0] as const).map((value, index) => (
              <button
                key={value}
                type="button"
                aria-pressed={range === value}
                onClick={() => setRange(value)}
                className={`min-h-9 rounded-md px-2.5 text-xs font-semibold transition-colors ${range === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {rangeLabels[index]}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 sm:h-72" role="img" aria-label={balanceTitle}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={visible}
              accessibilityLayer
              margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
            >
              <defs>
                <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={axis}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: string) => formatMonth(value, locale)}
              />
              <YAxis
                tick={axis}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(value: number) => compact.format(value)}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: "var(--foreground)" }}
                labelFormatter={(value) => formatMonth(String(value), locale)}
                formatter={(value) => money(value)}
              />
              <Area
                type="monotone"
                dataKey="balance"
                name={balanceTitle}
                stroke="var(--chart-1)"
                strokeWidth={3}
                fill="url(#balance-fill)"
                activeDot={{ r: 6, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="font-semibold">{monthlyTitle}</h2>
          <div className="mt-3 mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-chart-1" />
              {collectedLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-chart-4" />
              {spentLabel}
            </span>
          </div>
          <div className="h-60" role="img" aria-label={monthlyTitle}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={visible}
                accessibilityLayer
                margin={{ top: 8, right: 0, bottom: 4, left: 0 }}
              >
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={axis}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: string) => formatMonth(value, locale)}
                />
                <YAxis
                  tick={axis}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => compact.format(value)}
                  width={48}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "var(--foreground)" }}
                  labelFormatter={(value) => formatMonth(String(value), locale)}
                  formatter={(value, name) => [money(value), String(name)]}
                />
                <Bar
                  dataKey="collected"
                  name={collectedLabel}
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="spent"
                  name={spentLabel}
                  fill="var(--chart-4)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="font-semibold">{categoriesTitle}</h2>
          {categories.length === 0 ? (
            <p className="py-10 text-sm text-muted-foreground">{noCategories}</p>
          ) : (
            <>
              <div className="h-60" role="img" aria-label={categoriesTitle}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="totalSpent"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={61}
                      outerRadius={94}
                      paddingAngle={3}
                    >
                      {categories.map((item, index) => (
                        <Cell
                          key={item.name}
                          fill={`var(--chart-${(index % 6) + 1})`}
                          stroke="var(--card)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => money(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                {categories.map((item, index) => (
                  <span key={item.name} className="inline-flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-sm"
                      style={{ backgroundColor: `var(--chart-${(index % 6) + 1})` }}
                    />
                    {item.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
        <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 xl:col-span-2">
          <h2 className="font-semibold">{statusTitle}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {locale === "fr"
              ? "Répartition des membres selon leurs sommes dues"
              : "Members grouped by outstanding charges"}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {statuses.map((item) => (
              <div key={item.name} className="rounded-xl bg-muted/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                  <strong className="text-xl tabular-nums">{item.count}</strong>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${statuses.reduce((sum, status) => sum + status.count, 0) ? (item.count / statuses.reduce((sum, status) => sum + status.count, 0)) * 100 : 0}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
