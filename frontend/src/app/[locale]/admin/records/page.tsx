import { asc, desc, eq, sql } from "drizzle-orm";
import { formatDate } from "@/lib/format";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell, Notice } from "@/components/page-shell";
import { AdminForm } from "@/components/admin-form";
import { getDb, schema } from "@/lib/server-db";
import { getMembers, getPayments, getExpenses, getFines, getRota } from "@/lib/public-data";
import {
  addCategory,
  addCharge,
  addExpense,
  addFineReason,
  addMember,
  addPayment,
  addRotaDuty,
  deleteMember,
  deleteCategory,
  deleteFineReason,
  deleteRotaDuty,
  updateMember,
  updateCharge,
  updatePayment,
  updateExpense,
  updateCategory,
  updateFineReason,
  generateRota,
  setMemberActive,
  updateRotaDuty,
  voidRecord,
} from "../actions";

const input = "field";
export default async function RecordsPage() {
  const [t, locale] = await Promise.all([getTranslations("entry"), getLocale()]);
  const db = process.env.DATABASE_URL ? getDb() : null;
  if (!db) {
    const [members, payments, expenses, fines, duties] = await Promise.all([
      getMembers(),
      getPayments({ limit: 100 }),
      getExpenses({ limit: 100 }),
      getFines(),
      getRota(),
    ]);
    const modules = [
      { href: "/members", label: t("demoMembers"), count: members?.length ?? 0 },
      { href: "/payments", label: t("demoPayments"), count: payments?.length ?? 0 },
      { href: "/expenses", label: t("demoExpenses"), count: expenses?.length ?? 0 },
      { href: "/fines", label: t("demoFines"), count: fines?.length ?? 0 },
      { href: "/rota", label: t("demoDuties"), count: duties?.length ?? 0 },
    ];
    return (
      <PageShell title={t("title")} description={t("description")}>
        <Notice>{t("demoNotice")}</Notice>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/50"
            >
              <span className="text-sm text-muted-foreground">{module.label}</span>
              <strong className="mt-3 block text-2xl tabular-nums">{module.count}</strong>
              <span className="mt-2 block text-sm font-semibold text-primary">
                {t("viewRecords")} →
              </span>
            </Link>
          ))}
        </div>
      </PageShell>
    );
  }
  const [
    members,
    categories,
    reasons,
    duties,
    recentCharges,
    recentPayments,
    recentExpenses,
    activity,
  ] = await Promise.all([
    db
      .select({
        id: schema.members.id,
        fullName: schema.members.fullName,
        isActive: schema.members.isActive,
        phone: schema.members.phone,
        joinedAt: schema.members.joinedAt,
      })
      .from(schema.members)
      .orderBy(asc(schema.members.fullName)),
    db.select().from(schema.expenseCategories).orderBy(asc(schema.expenseCategories.nameEn)),
    db.select().from(schema.fineSchedule).orderBy(asc(schema.fineSchedule.reasonEn)),
    db
      .select({
        id: schema.kitRota.id,
        dutyDate: schema.kitRota.dutyDate,
        status: schema.kitRota.status,
        memberId: schema.kitRota.memberId,
        swappedWithMemberId: schema.kitRota.swappedWithMemberId,
        fullName: schema.members.fullName,
      })
      .from(schema.kitRota)
      .innerJoin(schema.members, eq(schema.kitRota.memberId, schema.members.id))
      .orderBy(desc(schema.kitRota.dutyDate)),
    db
      .select({
        id: schema.charges.id,
        label: schema.charges.label,
        amount: schema.charges.amount,
        dueDate: schema.charges.dueDate,
        issuedOn: schema.charges.issuedOn,
        type: schema.charges.type,
        memberId: schema.charges.memberId,
      })
      .from(schema.charges)
      .where(sql`${schema.charges.voidedAt} IS NULL`)
      .orderBy(desc(schema.charges.createdAt)),
    db
      .select({
        id: schema.payments.id,
        amount: schema.payments.amount,
        receiptNumber: schema.payments.receiptNumber,
        memberId: schema.payments.memberId,
        paidAt: schema.payments.paidAt,
        notes: schema.payments.notes,
      })
      .from(schema.payments)
      .where(sql`${schema.payments.voidedAt} IS NULL`)
      .orderBy(desc(schema.payments.createdAt)),
    db
      .select({
        id: schema.expenses.id,
        description: schema.expenses.description,
        amount: schema.expenses.amount,
        categoryId: schema.expenses.categoryId,
        spentAt: schema.expenses.spentAt,
        receiptUrl: schema.expenses.receiptUrl,
      })
      .from(schema.expenses)
      .where(sql`${schema.expenses.voidedAt} IS NULL`)
      .orderBy(desc(schema.expenses.createdAt)),
    db
      .select({
        id: schema.auditLog.id,
        action: schema.auditLog.action,
        tableName: schema.auditLog.tableName,
        recordId: schema.auditLog.recordId,
        createdAt: schema.auditLog.createdAt,
      })
      .from(schema.auditLog)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(30),
  ]);
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const memberSelect = (name = "memberId") => (
    <label className={input}>
      <span>{t("member")}</span>
      <select name={name} required defaultValue="">
        <option value="">{t("choose")}</option>
        {members
          .filter((m) => m.isActive)
          .map((m) => (
            <option value={m.id} key={m.id}>
              {m.fullName}
            </option>
          ))}
      </select>
    </label>
  );
  return (
    <PageShell title={t("title")} description={t("description")}>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-primary underline">
          {t("back")}
        </Link>
      </div>
      <nav aria-label={t("sections")} className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["members", "demoMembers"],
            ["charges", "manageCharges"],
            ["payments", "demoPayments"],
            ["expenses", "demoExpenses"],
            ["rota", "demoDuties"],
            ["settings", "settings"],
            ["corrections", "voidTitle"],
            ["activity", "activity"],
          ] as const
        ).map(([anchor, label]) => (
          <a
            key={anchor}
            href={`#${anchor}`}
            className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-primary hover:border-primary/50"
          >
            {t(label)}
          </a>
        ))}
      </nav>
      <div className="grid gap-8 lg:grid-cols-2">
        <section id="members">
          <h2 className="mb-3 text-lg font-semibold">{t("newMember")}</h2>
          <AdminForm
            action={addMember}
            errorText={t("saveError")}
            successText={t("saved")}
            submit={t("saveMember")}
          >
            <label className={input}>
              <span>{t("fullName")}</span>
              <input name="fullName" required maxLength={120} />
            </label>
            <label className={input}>
              <span>{t("phone")}</span>
              <input name="phone" type="tel" maxLength={30} />
            </label>
            <label className={input}>
              <span>{t("joined")}</span>
              <input name="joinedAt" type="date" required defaultValue={today} />
            </label>
          </AdminForm>
          <h3 className="mb-2 mt-6 font-semibold">{t("manageMembers")}</h3>
          <div className="space-y-2">
            {members.map((m) => (
              <details key={m.id} className="rounded-xl border border-border bg-card p-4">
                <summary className="cursor-pointer font-medium">
                  {m.fullName} {!m.isActive && `(${t("inactive")})`}
                </summary>
                <div className="mt-4 space-y-3">
                  <AdminForm
                    action={updateMember}
                    errorText={t("saveError")}
                    successText={t("saved")}
                    submit={t("updateMember")}
                  >
                    <input type="hidden" name="memberId" value={m.id} />
                    <label className={input}>
                      <span>{t("fullName")}</span>
                      <input name="fullName" defaultValue={m.fullName} required maxLength={120} />
                    </label>
                    <label className={input}>
                      <span>{t("phone")}</span>
                      <input name="phone" type="tel" defaultValue={m.phone ?? ""} maxLength={30} />
                    </label>
                    <label className={input}>
                      <span>{t("joined")}</span>
                      <input name="joinedAt" type="date" defaultValue={m.joinedAt} required />
                    </label>
                  </AdminForm>
                  <AdminForm
                    action={setMemberActive}
                    errorText={t("saveError")}
                    successText={t("saved")}
                    submit={m.isActive ? t("deactivate") : t("activate")}
                  >
                    <input type="hidden" name="memberId" value={m.id} />
                    <input type="hidden" name="isActive" value={String(!m.isActive)} />
                  </AdminForm>
                  <AdminForm
                    action={deleteMember}
                    confirmText={t("confirmDelete")}
                    errorText={t("deleteMemberHelp")}
                    successText={t("saved")}
                    submit={t("deleteMember")}
                  >
                    <input type="hidden" name="memberId" value={m.id} />
                    <p className="text-xs text-muted-foreground">{t("deleteMemberHelp")}</p>
                  </AdminForm>
                </div>
              </details>
            ))}
          </div>
        </section>
        <section id="charges">
          <h2 className="mb-3 text-lg font-semibold">{t("newCharge")}</h2>
          <AdminForm
            action={addCharge}
            errorText={t("saveError")}
            successText={t("saved")}
            submit={t("saveCharge")}
          >
            {memberSelect()}
            <label className={input}>
              <span>{t("type")}</span>
              <select name="type">
                <option value="dues">{t("dues")}</option>
                <option value="fine">{t("fine")}</option>
              </select>
            </label>
            <label className={input}>
              <span>{t("fineReason")}</span>
              <select name="fineScheduleId">
                <option value="">{t("chooseIfFine")}</option>
                {reasons
                  .filter((r) => r.isActive)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {locale === "fr" ? r.reasonFr : r.reasonEn} ({r.defaultAmount} FCFA)
                    </option>
                  ))}
              </select>
            </label>
            <label className={input}>
              <span>{t("label")}</span>
              <input name="label" required maxLength={160} />
            </label>
            <label className={input}>
              <span>{t("amount")}</span>
              <input name="amount" type="number" min="1" max="2147483647" required />
            </label>
            <label className={input}>
              <span>{t("issued")}</span>
              <input name="issuedOn" type="date" required defaultValue={today} />
            </label>
            <label className={input}>
              <span>{t("due")}</span>
              <input name="dueDate" type="date" required defaultValue={today} />
            </label>
          </AdminForm>
          <h3 className="mb-2 mt-6 font-semibold">{t("manageCharges")}</h3>
          <p className="mb-3 text-xs text-muted-foreground">{t("statusHelp")}</p>
          <div className="space-y-2">
            {recentCharges.map((charge) => (
              <details key={charge.id} className="rounded-xl border border-border bg-card p-4">
                <summary className="cursor-pointer font-medium">
                  {charge.label} · {members.find((m) => m.id === charge.memberId)?.fullName} ·{" "}
                  {charge.amount} FCFA
                </summary>
                <AdminForm
                  action={updateCharge}
                  errorText={t("saveError")}
                  successText={t("saved")}
                  submit={t("updateCharge")}
                >
                  <input type="hidden" name="chargeId" value={charge.id} />
                  <label className={input}>
                    <span>{t("member")}</span>
                    <select name="memberId" defaultValue={charge.memberId} required>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="text-xs text-muted-foreground">{t("reassignHelp")}</p>
                  <label className={input}>
                    <span>{t("label")}</span>
                    <input name="label" defaultValue={charge.label} required maxLength={160} />
                  </label>
                  <label className={input}>
                    <span>{t("amount")}</span>
                    <input
                      name="amount"
                      type="number"
                      min="1"
                      max="2147483647"
                      defaultValue={charge.amount}
                      required
                    />
                  </label>
                  <label className={input}>
                    <span>{t("due")}</span>
                    <input name="dueDate" type="date" defaultValue={charge.dueDate} required />
                  </label>
                </AdminForm>
              </details>
            ))}
          </div>
        </section>
        <section id="payments">
          <h2 className="mb-3 text-lg font-semibold">{t("newPayment")}</h2>
          <AdminForm
            action={addPayment}
            errorText={t("saveError")}
            successText={t("saved")}
            submit={t("savePayment")}
          >
            {memberSelect()}
            <label className={input}>
              <span>{t("amount")}</span>
              <input name="amount" type="number" min="1" max="2147483647" required />
            </label>
            <label className={input}>
              <span>{t("paid")}</span>
              <input name="paidAt" type="date" required defaultValue={today} />
            </label>
            <label className={input}>
              <span>{t("notes")}</span>
              <textarea name="notes" maxLength={500} />
            </label>
            <p className="text-xs text-muted-foreground">{t("allocationHelp")}</p>
          </AdminForm>
          <h3 className="mb-2 mt-6 font-semibold">{t("managePayments")}</h3>
          <div className="space-y-2">
            {recentPayments.map((payment) => (
              <details key={payment.id} className="rounded-xl border border-border bg-card p-4">
                <summary className="cursor-pointer font-medium">
                  #{payment.receiptNumber} ·{" "}
                  {members.find((m) => m.id === payment.memberId)?.fullName} · {payment.amount} FCFA
                </summary>
                <AdminForm
                  action={updatePayment}
                  errorText={t("saveError")}
                  successText={t("saved")}
                  submit={t("updatePayment")}
                >
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <label className={input}>
                    <span>{t("amount")}</span>
                    <input
                      name="amount"
                      type="number"
                      min="1"
                      max="2147483647"
                      defaultValue={payment.amount}
                      required
                    />
                  </label>
                  <label className={input}>
                    <span>{t("paid")}</span>
                    <input
                      name="paidAt"
                      type="date"
                      defaultValue={new Intl.DateTimeFormat("sv-SE", {
                        timeZone: "Africa/Douala",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(payment.paidAt)}
                      required
                    />
                  </label>
                  <label className={input}>
                    <span>{t("notes")}</span>
                    <textarea name="notes" defaultValue={payment.notes ?? ""} maxLength={500} />
                  </label>
                  <p className="text-xs text-muted-foreground">{t("allocationHelp")}</p>
                </AdminForm>
              </details>
            ))}
          </div>
        </section>
        <section id="expenses">
          <h2 className="mb-3 text-lg font-semibold">{t("newExpense")}</h2>
          <AdminForm
            action={addExpense}
            errorText={t("saveError")}
            successText={t("saved")}
            submit={t("saveExpense")}
          >
            <label className={input}>
              <span>{t("category")}</span>
              <select name="categoryId" required defaultValue="">
                <option value="">{t("choose")}</option>
                {categories.map((c) => (
                  <option value={c.id} key={c.id}>
                    {locale === "fr" ? c.nameFr : c.nameEn}
                  </option>
                ))}
              </select>
            </label>
            <label className={input}>
              <span>{t("amount")}</span>
              <input name="amount" type="number" min="1" max="2147483647" required />
            </label>
            <label className={input}>
              <span>{t("descriptionField")}</span>
              <input name="description" required maxLength={300} />
            </label>
            <label className={input}>
              <span>{t("spent")}</span>
              <input name="spentAt" type="date" required defaultValue={today} />
            </label>
            <label className={input}>
              <span>{t("receiptUrl")}</span>
              <input name="receiptUrl" type="url" maxLength={1000} placeholder="https://" />
            </label>
          </AdminForm>
          <h3 className="mb-2 mt-6 font-semibold">{t("manageExpenses")}</h3>
          <div className="space-y-2">
            {recentExpenses.map((expense) => (
              <details key={expense.id} className="rounded-xl border border-border bg-card p-4">
                <summary className="cursor-pointer font-medium">
                  {expense.description} · {expense.amount} FCFA
                </summary>
                <AdminForm
                  action={updateExpense}
                  errorText={t("saveError")}
                  successText={t("saved")}
                  submit={t("updateExpense")}
                >
                  <input type="hidden" name="expenseId" value={expense.id} />
                  <label className={input}>
                    <span>{t("category")}</span>
                    <select name="categoryId" defaultValue={expense.categoryId} required>
                      {categories.map((c) => (
                        <option value={c.id} key={c.id}>
                          {locale === "fr" ? c.nameFr : c.nameEn}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={input}>
                    <span>{t("amount")}</span>
                    <input
                      name="amount"
                      type="number"
                      min="1"
                      max="2147483647"
                      defaultValue={expense.amount}
                      required
                    />
                  </label>
                  <label className={input}>
                    <span>{t("descriptionField")}</span>
                    <input
                      name="description"
                      defaultValue={expense.description}
                      required
                      maxLength={300}
                    />
                  </label>
                  <label className={input}>
                    <span>{t("spent")}</span>
                    <input
                      name="spentAt"
                      type="date"
                      defaultValue={new Intl.DateTimeFormat("sv-SE", {
                        timeZone: "Africa/Douala",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(expense.spentAt)}
                      required
                    />
                  </label>
                  <label className={input}>
                    <span>{t("receiptUrl")}</span>
                    <input
                      name="receiptUrl"
                      type="url"
                      defaultValue={expense.receiptUrl ?? ""}
                      maxLength={1000}
                    />
                  </label>
                </AdminForm>
              </details>
            ))}
          </div>
        </section>
        <section id="rota">
          <h2 className="mb-3 text-lg font-semibold">{t("newDuty")}</h2>
          <AdminForm
            action={addRotaDuty}
            errorText={t("saveError")}
            successText={t("saved")}
            submit={t("saveDuty")}
          >
            {memberSelect()}
            <label className={input}>
              <span>{t("sunday")}</span>
              <input name="dutyDate" type="date" required />
            </label>
          </AdminForm>
          <div className="mt-5">
            <h3 className="mb-2 font-semibold">{t("generateTitle")}</h3>
            <AdminForm
              action={generateRota}
              errorText={t("saveError")}
              successText={t("saved")}
              submit={t("generateButton")}
            >
              <label className={input}>
                <span>{t("startSunday")}</span>
                <input name="startDate" type="date" required />
              </label>
              <label className={input}>
                <span>{t("weeks")}</span>
                <input name="weeks" type="number" min="1" max="26" defaultValue="8" required />
              </label>
              <p className="text-xs text-muted-foreground">{t("generateHelp")}</p>
            </AdminForm>
          </div>
          <div className="mt-4 space-y-3">
            {duties.map((d) => (
              <div key={d.id}>
                <p className="mb-1 text-sm">
                  {d.dutyDate} · {d.fullName} · {d.status}
                </p>
                <AdminForm
                  action={updateRotaDuty}
                  errorText={t("saveError")}
                  successText={t("saved")}
                  submit={t("updateDuty")}
                >
                  <input type="hidden" name="dutyId" value={d.id} />
                  <label className={input}>
                    <span>{t("member")}</span>
                    <select name="memberId" defaultValue={d.memberId} required>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={input}>
                    <span>{t("status")}</span>
                    <select name="status" defaultValue={d.status}>
                      <option value="scheduled">{t("scheduled")}</option>
                      <option value="done">{t("done")}</option>
                      <option value="missed">{t("missed")}</option>
                      <option value="swapped">{t("swapped")}</option>
                    </select>
                  </label>
                  <label className={input}>
                    <span>{t("swapMember")}</span>
                    <select name="swappedWithMemberId" defaultValue={d.swappedWithMemberId ?? ""}>
                      <option value="">{t("chooseIfSwapped")}</option>
                      {members
                        .filter((m) => m.isActive && m.id !== d.memberId)
                        .map((m) => (
                          <option value={m.id} key={m.id}>
                            {m.fullName}
                          </option>
                        ))}
                    </select>
                  </label>
                </AdminForm>
                <AdminForm
                  action={deleteRotaDuty}
                  confirmText={t("confirmDelete")}
                  errorText={t("saveError")}
                  successText={t("saved")}
                  submit={t("deleteDuty")}
                >
                  <input type="hidden" name="dutyId" value={d.id} />
                </AdminForm>
              </div>
            ))}
          </div>
        </section>
        <section id="settings">
          <h2 className="mb-3 text-lg font-semibold">{t("newCategory")}</h2>
          <AdminForm
            action={addCategory}
            errorText={t("saveError")}
            successText={t("saved")}
            submit={t("saveCategory")}
          >
            <label className={input}>
              <span>{t("nameEn")}</span>
              <input name="nameEn" required maxLength={100} />
            </label>
            <label className={input}>
              <span>{t("nameFr")}</span>
              <input name="nameFr" required maxLength={100} />
            </label>
          </AdminForm>
          <h2 className="mb-3 mt-6 text-lg font-semibold">{t("newReason")}</h2>
          <AdminForm
            action={addFineReason}
            errorText={t("saveError")}
            successText={t("saved")}
            submit={t("saveReason")}
          >
            <label className={input}>
              <span>{t("reasonEn")}</span>
              <input name="reasonEn" required maxLength={120} />
            </label>
            <label className={input}>
              <span>{t("reasonFr")}</span>
              <input name="reasonFr" required maxLength={120} />
            </label>
            <label className={input}>
              <span>{t("defaultAmount")}</span>
              <input name="defaultAmount" type="number" min="1" required />
            </label>
          </AdminForm>
          <h3 className="mb-2 mt-6 font-semibold">{t("manageCategories")}</h3>
          <div className="space-y-2">
            {categories.map((category) => (
              <details key={category.id} className="rounded-xl border border-border bg-card p-4">
                <summary className="cursor-pointer font-medium">
                  {locale === "fr" ? category.nameFr : category.nameEn}
                </summary>
                <div className="mt-3 space-y-3">
                  <AdminForm
                    action={updateCategory}
                    errorText={t("saveError")}
                    successText={t("saved")}
                    submit={t("updateCategory")}
                  >
                    <input type="hidden" name="categoryId" value={category.id} />
                    <label className={input}>
                      <span>{t("nameEn")}</span>
                      <input
                        name="nameEn"
                        defaultValue={category.nameEn}
                        required
                        maxLength={100}
                      />
                    </label>
                    <label className={input}>
                      <span>{t("nameFr")}</span>
                      <input
                        name="nameFr"
                        defaultValue={category.nameFr}
                        required
                        maxLength={100}
                      />
                    </label>
                  </AdminForm>
                  <AdminForm
                    action={deleteCategory}
                    confirmText={t("confirmDelete")}
                    errorText={t("deleteLookupHelp")}
                    successText={t("saved")}
                    submit={t("deleteCategory")}
                  >
                    <input type="hidden" name="categoryId" value={category.id} />
                    <p className="text-xs text-muted-foreground">{t("deleteLookupHelp")}</p>
                  </AdminForm>
                </div>
              </details>
            ))}
          </div>
          <h3 className="mb-2 mt-6 font-semibold">{t("manageReasons")}</h3>
          <div className="space-y-2">
            {reasons.map((reason) => (
              <details key={reason.id} className="rounded-xl border border-border bg-card p-4">
                <summary className="cursor-pointer font-medium">
                  {locale === "fr" ? reason.reasonFr : reason.reasonEn}{" "}
                  {!reason.isActive && `(${t("inactive")})`}
                </summary>
                <div className="mt-3 space-y-3">
                  <AdminForm
                    action={updateFineReason}
                    errorText={t("saveError")}
                    successText={t("saved")}
                    submit={t("updateReason")}
                  >
                    <input type="hidden" name="reasonId" value={reason.id} />
                    <label className={input}>
                      <span>{t("reasonEn")}</span>
                      <input
                        name="reasonEn"
                        defaultValue={reason.reasonEn}
                        required
                        maxLength={120}
                      />
                    </label>
                    <label className={input}>
                      <span>{t("reasonFr")}</span>
                      <input
                        name="reasonFr"
                        defaultValue={reason.reasonFr}
                        required
                        maxLength={120}
                      />
                    </label>
                    <label className={input}>
                      <span>{t("defaultAmount")}</span>
                      <input
                        name="defaultAmount"
                        type="number"
                        min="1"
                        defaultValue={reason.defaultAmount}
                        required
                      />
                    </label>
                    <label className={input}>
                      <span>{t("status")}</span>
                      <select name="isActive" defaultValue={String(reason.isActive)}>
                        <option value="true">{t("activate")}</option>
                        <option value="false">{t("deactivate")}</option>
                      </select>
                    </label>
                  </AdminForm>
                  <AdminForm
                    action={deleteFineReason}
                    confirmText={t("confirmDelete")}
                    errorText={t("deleteLookupHelp")}
                    successText={t("saved")}
                    submit={t("deleteReason")}
                  >
                    <input type="hidden" name="reasonId" value={reason.id} />
                    <p className="text-xs text-muted-foreground">{t("deleteLookupHelp")}</p>
                  </AdminForm>
                </div>
              </details>
            ))}
          </div>
        </section>
        <section id="corrections">
          <h2 className="mb-3 text-lg font-semibold">{t("voidTitle")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("voidHelp")}</p>
          {[
            ...recentCharges.map((r) => ({
              table: "charges",
              id: r.id,
              label: `${r.label} · ${r.amount}`,
            })),
            ...recentPayments.map((r) => ({
              table: "payments",
              id: r.id,
              label: `#${r.receiptNumber} · ${r.amount}`,
            })),
            ...recentExpenses.map((r) => ({
              table: "expenses",
              id: r.id,
              label: `${r.description} · ${r.amount}`,
            })),
          ].map((r) => (
            <div key={r.id} className="mb-3">
              <p className="mb-1 text-sm">{r.label}</p>
              <AdminForm
                action={voidRecord}
                confirmText={t("confirmDelete")}
                errorText={t("saveError")}
                successText={t("saved")}
                submit={t("voidButton")}
              >
                <input type="hidden" name="table" value={r.table} />
                <input type="hidden" name="recordId" value={r.id} />
                <label className={input}>
                  <span>{t("voidReason")}</span>
                  <input name="reason" required maxLength={300} />
                </label>
              </AdminForm>
            </div>
          ))}
        </section>
        <section id="activity" className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">{t("activity")}</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted">
                <tr>
                  <th className="px-4 py-3">{t("date")}</th>
                  <th className="px-4 py-3">{t("action")}</th>
                  <th className="px-4 py-3">{t("record")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activity.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDate(item.createdAt, locale as "fr" | "en")}
                    </td>
                    <td className="px-4 py-3">{item.action}</td>
                    <td className="px-4 py-3">
                      {item.tableName} · {item.recordId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
