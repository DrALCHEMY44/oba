"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 rounded-md border border-border bg-card px-4 font-medium hover:bg-muted"
    >
      {label}
    </button>
  );
}
