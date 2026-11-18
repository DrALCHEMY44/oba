"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";

export function SignOutButton() {
  const t = useTranslations("admin");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium"
        onClick={async () => {
          setBusy(true);
          setError(false);
          try {
            const result = await authClient.signOut();
            if (result.error) {
              setError(true);
              return;
            }
            router.replace("/login");
            router.refresh();
          } catch {
            setError(true);
          } finally {
            setBusy(false);
          }
        }}
      >
        <LogOut className="size-4" aria-hidden="true" />
        {t("signOut")}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {t("signOutError")}
        </p>
      )}
    </div>
  );
}
