"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const t = useTranslations("security");
  const [active, setActive] = useState(enabled);
  const [enrollment, setEnrollment] = useState<{ totpURI: string; backupCodes: string[] } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    try {
      if (enrollment) {
        const result = await authClient.twoFactor.verifyTotp({ code: String(form.get("code")) });
        if (result.error) {
          setError(true);
          return;
        }
        setActive(true);
        setEnrollment(null);
        setSaved(true);
      } else if (active) {
        const result = await authClient.twoFactor.disable({
          password: String(form.get("password")),
        });
        if (result.error) {
          setError(true);
          return;
        }
        setActive(false);
        setSaved(true);
      } else {
        const result = await authClient.twoFactor.enable({
          password: String(form.get("password")),
          method: "totp",
        });
        if (result.error || !result.data || result.data.method !== "totp") {
          setError(true);
          return;
        }
        setEnrollment({ totpURI: result.data.totpURI, backupCodes: result.data.backupCodes });
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl rounded-xl border border-border bg-card p-6">
      <p className="mb-6 flex items-center gap-2 text-sm font-medium">
        <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
        {active ? t("enabled") : t("disabled")}
      </p>
      <form onSubmit={submit} className="space-y-5">
        {enrollment ? (
          <>
            <p className="text-sm leading-6 text-muted-foreground">{t("setupHelp")}</p>
            <a href={enrollment.totpURI} className="action-button">
              {t("openAuthenticator")}
            </a>
            <code className="block break-all rounded-md bg-muted p-3 text-xs leading-5">
              {enrollment.totpURI}
            </code>
            <div className="rounded-md border border-border p-4">
              <h2 className="font-semibold">{t("backupTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("backupHelp")}</p>
              <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm">
                {enrollment.backupCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
            </div>
            <label className="field">
              {t("code")}
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
              />
            </label>
          </>
        ) : (
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
        )}
        {error && (
          <p role="alert" className="text-sm leading-6 text-destructive">
            {t("error")}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-primary">
            {t("saved")}
          </p>
        )}
        <button type="submit" disabled={busy} className="action-button">
          {busy ? t("working") : enrollment ? t("confirm") : active ? t("disable") : t("enable")}
        </button>
      </form>
    </div>
  );
}
