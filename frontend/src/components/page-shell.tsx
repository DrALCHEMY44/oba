import type { ReactNode } from "react";
import { Info } from "lucide-react";

export function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 sm:py-9">
      <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight sm:text-[2rem]">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      )}
      <div className="mt-8">{children}</div>
    </main>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
      <Info className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card px-4 py-5 sm:px-5 ${className}`}>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div
        data-slot="stat-value"
        className="mt-3 break-words text-xl font-semibold leading-tight tracking-tight tabular-nums sm:text-[1.65rem]"
      >
        {value}
      </div>
    </div>
  );
}
