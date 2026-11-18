"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";

export function LoginForm() {
  const t = useTranslations("login");
  const router = useRouter();
  const [step, setStep] = useState<"password" | "twoFactor">("password");
  const [backup, setBackup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    const form = new FormData(event.currentTarget);
    try {
      if (step === "password") {
        const result = await authClient.signIn.email({
          email: String(form.get("email")),
          password: String(form.get("password")),
        });
        if (result.error) {
          setError(true);
          return;
        }
        if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) {
          setStep("twoFactor");
          return;
        }
      } else {
        const code = String(form.get("code"));
        const result = backup
          ? await authClient.twoFactor.verifyBackupCode({ code })
          : await authClient.twoFactor.verifyTotp({ code });
        if (result.error) {
          setError(true);
          return;
        }
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {step === "password" ? (
        <>
          <label className="field">
            {t("email")}
            <input name="email" type="email" autoComplete="username" required maxLength={254} />
          </label>
          <label className="field">
            {t("password")}
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
        </>
      ) : (
        <>
          <p className="text-sm leading-6 text-muted-foreground">
            {backup ? t("backupDescription") : t("codeDescription")}
          </p>
          <label className="field">
            {backup ? t("backupCode") : t("code")}
            <input
              name="code"
              type="text"
              autoComplete="one-time-code"
              inputMode={backup ? "text" : "numeric"}
              pattern={backup ? undefined : "[0-9]{6}"}
              required
              maxLength={64}
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={backup}
              onChange={(event) => setBackup(event.target.checked)}
              className="size-4"
            />
            {t("useBackup")}
          </label>
        </>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm leading-6 text-destructive"
        >
          {t("error")}
        </p>
      )}
      <button disabled={busy} type="submit" className="action-button w-full">
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <ArrowRight className="size-4" aria-hidden="true" />
        )}
        {busy ? t("signingIn") : step === "password" ? t("signIn") : t("verify")}
      </button>
    </form>
  );
}
