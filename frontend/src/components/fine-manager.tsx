"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatCalendarDate, formatMoney } from "@/lib/format";
import { AdminForm } from "@/components/admin-form";
import { addCharge, updateCharge, voidRecord } from "@/app/[locale]/admin/actions";

type Fine = {
  id: string;
  label: string;
  memberId: string;
  memberName: string;
  issuedOn: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  reasonEn: string;
  reasonFr: string;
};
type Member = { id: string; fullName: string; isActive: boolean };
type Reason = { id: string; reasonEn: string; reasonFr: string; defaultAmount: number };
const key = "oba-demo-fines-v1";
const getSnapshot = () => window.localStorage.getItem(key);
const getServerSnapshot = () => null;
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("oba-demo-fines", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("oba-demo-fines", callback);
  };
}
function write(fines: Fine[]) {
  window.localStorage.setItem(key, JSON.stringify(fines));
  window.dispatchEvent(new Event("oba-demo-fines"));
}

export function FineManager({
  initialFines,
  members,
  reasons,
  locale,
  mode,
  today,
}: {
  initialFines: Fine[];
  members: Member[];
  reasons: Reason[];
  locale: "fr" | "en";
  mode: "demo" | "live" | "readonly";
  today: string;
}) {
  const t = useTranslations("fines");
  const entry = useTranslations("entry");
  const statusText = useTranslations("status");
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const fines = useMemo(() => {
    if (mode !== "demo" || raw === null) return initialFines;
    try {
      const value: unknown = JSON.parse(raw);
      return Array.isArray(value) ? (value as Fine[]) : initialFines;
    } catch {
      return initialFines;
    }
  }, [initialFines, mode, raw]);
  const [editing, setEditing] = useState<string | null>(null);
  const [memberId, setMemberId] = useState("");
  const [reasonId, setReasonId] = useState(reasons[0]?.id ?? "");
  const [label, setLabel] = useState(
    locale === "fr" ? (reasons[0]?.reasonFr ?? "") : (reasons[0]?.reasonEn ?? ""),
  );
  const [amount, setAmount] = useState(String(reasons[0]?.defaultAmount ?? ""));
  const [issuedOn, setIssuedOn] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const [message, setMessage] = useState("");
  const selectedReason = reasons.find((item) => item.id === reasonId);
  const selectReason = (value: string) => {
    const reason = reasons.find((item) => item.id === value);
    setReasonId(value);
    if (reason) {
      setLabel(locale === "fr" ? reason.reasonFr : reason.reasonEn);
      setAmount(String(reason.defaultAmount));
    }
  };
  const fields = (
    <>
      <input type="hidden" name="type" value="fine" />
      <label className="field">
        <span>{entry("member")}</span>
        <select
          name="memberId"
          value={memberId}
          onChange={(event) => setMemberId(event.target.value)}
          required
        >
          <option value="">{entry("choose")}</option>
          {members
            .filter((member) => member.isActive)
            .map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName}
              </option>
            ))}
        </select>
      </label>
      <label className="field">
        <span>{t("reason")}</span>
        <select
          name="fineScheduleId"
          value={reasonId}
          onChange={(event) => selectReason(event.target.value)}
          required
        >
          {reasons.map((reason) => (
            <option key={reason.id} value={reason.id}>
              {locale === "fr" ? reason.reasonFr : reason.reasonEn}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{entry("label")}</span>
        <input
          name="label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          required
          maxLength={160}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="field">
          <span>{entry("amount")}</span>
          <input
            name="amount"
            type="number"
            min="1"
            max="2147483647"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>{entry("issued")}</span>
          <input
            name="issuedOn"
            type="date"
            value={issuedOn}
            onChange={(event) => setIssuedOn(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>{entry("due")}</span>
          <input
            name="dueDate"
            type="date"
            min={issuedOn}
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </label>
      </div>
    </>
  );
  function saveDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    if (
      !memberId ||
      !selectedReason ||
      !label.trim() ||
      !Number.isSafeInteger(value) ||
      value <= 0 ||
      dueDate < issuedOn
    ) {
      setMessage(t("invalidFine"));
      return;
    }
    const previous = editing ? fines.find((fine) => fine.id === editing) : undefined;
    if (previous && value < previous.paidAmount) {
      setMessage(t("belowPaid"));
      return;
    }
    const fine: Fine = {
      id: previous?.id ?? crypto.randomUUID(),
      label: label.trim(),
      memberId,
      memberName: members.find((member) => member.id === memberId)?.fullName ?? "",
      issuedOn,
      dueDate,
      amount: value,
      paidAmount: previous?.paidAmount ?? 0,
      outstandingAmount: value - (previous?.paidAmount ?? 0),
      reasonEn: selectedReason.reasonEn,
      reasonFr: selectedReason.reasonFr,
    };
    write(
      previous ? fines.map((item) => (item.id === previous.id ? fine : item)) : [fine, ...fines],
    );
    setEditing(null);
    setMemberId("");
    setMessage(t("demoSaved"));
  }
  function editDemo(fine: Fine) {
    setEditing(fine.id);
    setMemberId(fine.memberId);
    setReasonId(
      reasons.find((reason) => reason.reasonEn === fine.reasonEn)?.id ?? reasons[0]?.id ?? "",
    );
    setLabel(fine.label);
    setAmount(String(fine.amount));
    setIssuedOn(fine.issuedOn);
    setDueDate(fine.dueDate);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const todayDate = today;
  return (
    <>
      {mode !== "readonly" && (
        <section className="mb-7 rounded-2xl border border-primary/30 bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{editing ? t("editFine") : t("addFine")}</h2>
            {mode === "demo" && (
              <p className="mt-1 text-xs text-muted-foreground">{t("demoHelp")}</p>
            )}
          </div>
          {mode === "live" ? (
            <AdminForm
              action={addCharge}
              errorText={entry("saveError")}
              successText={entry("saved")}
              submit={t("addFine")}
            >
              {fields}
            </AdminForm>
          ) : (
            <form onSubmit={saveDemo} className="space-y-3">
              {fields}
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="action-button">
                  {editing ? t("saveFine") : t("addFine")}
                </button>
                {editing && (
                  <button
                    type="button"
                    className="min-h-12 rounded-md border border-border px-4 text-sm"
                    onClick={() => {
                      setEditing(null);
                      setMemberId("");
                      setMessage("");
                    }}
                  >
                    {t("cancel")}
                  </button>
                )}
              </div>
              {message && (
                <p role="status" className="text-sm text-primary">
                  {message}
                </p>
              )}
            </form>
          )}
        </section>
      )}
      {fines.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          {t("noFines")}
        </p>
      ) : (
        <div className="space-y-3">
          {fines.map((fine) => {
            const status =
              fine.outstandingAmount === 0
                ? "paid"
                : fine.dueDate < todayDate
                  ? "overdue"
                  : fine.paidAmount > 0
                    ? "partial"
                    : "unpaid";
            return (
              <article key={fine.id} className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-medium">
                      {(locale === "fr" ? fine.reasonFr : fine.reasonEn) || fine.label}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <Link
                        href={`/members/${fine.memberId}`}
                        className="text-primary hover:underline"
                      >
                        {fine.memberName}
                      </Link>{" "}
                      · {formatCalendarDate(fine.issuedOn, locale)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry("due")}: {formatCalendarDate(fine.dueDate, locale)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <strong>{formatMoney(fine.amount, locale)}</strong>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === "overdue" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" : status === "paid" ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" : status === "partial" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-muted text-foreground"}`}
                    >
                      {statusText(status)}
                    </span>
                  </div>
                </div>
                {mode === "demo" && (
                  <div className="mt-4 flex gap-3 border-t border-border pt-3 text-sm">
                    <button
                      type="button"
                      onClick={() => editDemo(fine)}
                      className="font-semibold text-primary hover:underline"
                    >
                      {t("editFine")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(t("confirmRemove")))
                          write(fines.filter((item) => item.id !== fine.id));
                      }}
                      className="font-semibold text-destructive hover:underline"
                    >
                      {t("removeFine")}
                    </button>
                  </div>
                )}
                {mode === "live" && (
                  <details className="mt-4 border-t border-border pt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-primary">
                      {t("manageFine")}
                    </summary>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <AdminForm
                        action={updateCharge}
                        errorText={entry("saveError")}
                        successText={entry("saved")}
                        submit={t("saveFine")}
                      >
                        <input type="hidden" name="chargeId" value={fine.id} />
                        <label className="field">
                          <span>{entry("member")}</span>
                          <select name="memberId" defaultValue={fine.memberId} required>
                            {members.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.fullName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>{entry("label")}</span>
                          <input name="label" defaultValue={fine.label} required maxLength={160} />
                        </label>
                        <label className="field">
                          <span>{entry("amount")}</span>
                          <input
                            name="amount"
                            type="number"
                            min={fine.paidAmount || 1}
                            max="2147483647"
                            defaultValue={fine.amount}
                            required
                          />
                        </label>
                        <label className="field">
                          <span>{entry("due")}</span>
                          <input
                            name="dueDate"
                            type="date"
                            min={fine.issuedOn}
                            defaultValue={fine.dueDate}
                            required
                          />
                        </label>
                      </AdminForm>
                      <AdminForm
                        action={voidRecord}
                        errorText={entry("saveError")}
                        successText={entry("saved")}
                        submit={t("removeFine")}
                        confirmText={t("confirmRemove")}
                      >
                        <input type="hidden" name="table" value="charges" />
                        <input type="hidden" name="recordId" value={fine.id} />
                        <label className="field">
                          <span>{entry("voidReason")}</span>
                          <input name="reason" required maxLength={300} />
                        </label>
                      </AdminForm>
                    </div>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
