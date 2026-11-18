"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/server-db";
import { requireAdmin } from "@/lib/require-admin";

export type ActionState = { error?: string; success?: boolean };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const date = /^\d{4}-\d{2}-\d{2}$/;
const string = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const required = (data: FormData, key: string, max = 200) => {
  const value = string(data, key);
  if (!value || value.length > max) throw new Error("invalid");
  return value;
};
const id = (data: FormData, key: string) => {
  const value = required(data, key, 36);
  if (!uuid.test(value)) throw new Error("invalid");
  return value;
};
const day = (data: FormData, key: string) => {
  const value = required(data, key, 10);
  if (!date.test(value) || Number.isNaN(Date.parse(`${value}T12:00:00Z`)))
    throw new Error("invalid");
  return value;
};
const amount = (data: FormData, key: string) => {
  const value = Number(required(data, key, 10));
  if (!Number.isSafeInteger(value) || value <= 0 || value > 2147483647) throw new Error("invalid");
  return value;
};
const stamp = (dayValue: string) => new Date(`${dayValue}T12:00:00+01:00`);
function refresh() {
  for (const path of ["/fr", "/en"]) revalidatePath(path, "layout");
}
async function run(work: (actor: string) => Promise<void>): Promise<ActionState> {
  const session = await requireAdmin();
  try {
    await work(session.user.id);
    refresh();
    return { success: true };
  } catch (error) {
    console.error("Treasurer write failed", error);
    return { error: "SAVE_FAILED" };
  }
}
const audit = (
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  actor: string,
  action: string,
  tableName: string,
  recordId: string,
  newValues: object,
) => tx.insert(schema.auditLog).values({ actorId: actor, action, tableName, recordId, newValues });

export async function addMember(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const fullName = required(data, "fullName", 120);
    const joinedAt = day(data, "joinedAt");
    const phone = string(data, "phone");
    if (phone.length > 30) throw new Error("invalid");
    await getDb().transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.members)
        .values({ fullName, joinedAt, phone: phone || null })
        .returning({ id: schema.members.id });
      await audit(tx, actor, "create", "members", row.id, { fullName, joinedAt });
    });
  });
}

export async function setMemberActive(
  _previous: ActionState,
  data: FormData,
): Promise<ActionState> {
  return run(async (actor) => {
    const memberId = id(data, "memberId");
    const isActive = string(data, "isActive") === "true";
    await getDb().transaction(async (tx) => {
      const [row] = await tx
        .update(schema.members)
        .set({ isActive })
        .where(eq(schema.members.id, memberId))
        .returning({ id: schema.members.id });
      if (!row) throw new Error("missing");
      await audit(tx, actor, "update", "members", row.id, { isActive });
    });
  });
}

export async function addCharge(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const memberId = id(data, "memberId");
    const type = string(data, "type");
    if (type !== "dues" && type !== "fine") throw new Error("invalid");
    const fineScheduleId = type === "fine" ? id(data, "fineScheduleId") : null;
    const label = required(data, "label", 160);
    const value = amount(data, "amount");
    const issuedOn = day(data, "issuedOn");
    const dueDate = day(data, "dueDate");
    if (dueDate < issuedOn) throw new Error("invalid");
    await getDb().transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.charges)
        .values({
          memberId,
          type,
          fineScheduleId,
          label,
          amount: value,
          issuedOn,
          dueDate,
          issuedBy: actor,
        })
        .returning({ id: schema.charges.id });
      await audit(tx, actor, "create", "charges", row.id, {
        memberId,
        type,
        fineScheduleId,
        label,
        amount: value,
        issuedOn,
        dueDate,
      });
    });
  });
}

export async function addPayment(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const memberId = id(data, "memberId");
    const value = amount(data, "amount");
    const paidAt = stamp(day(data, "paidAt"));
    const notes = string(data, "notes").slice(0, 500) || null;
    await getDb().transaction(async (tx) => {
      // Serialize payments for one member to prevent concurrent over-allocation.
      const [member] = await tx
        .select({ id: schema.members.id })
        .from(schema.members)
        .where(eq(schema.members.id, memberId))
        .for("update");
      if (!member) throw new Error("missing");
      const open = await tx.execute(
        sql`SELECT cb.id, cb.outstanding_amount FROM charge_balances cb WHERE cb.member_id = ${memberId}::uuid AND cb.outstanding_amount > 0 ORDER BY cb.due_date, cb.id`,
      );
      const [payment] = await tx
        .insert(schema.payments)
        .values({ memberId, amount: value, paidAt, notes })
        .returning({ id: schema.payments.id });
      let remaining = value;
      for (const charge of open.rows) {
        if (remaining <= 0) break;
        const allocated = Math.min(remaining, Number(charge.outstanding_amount));
        await tx
          .insert(schema.paymentAllocations)
          .values({ paymentId: payment.id, chargeId: String(charge.id), amount: allocated });
        remaining -= allocated;
      }
      await audit(tx, actor, "create", "payments", payment.id, {
        memberId,
        amount: value,
        paidAt,
        unallocated: remaining,
      });
    });
  });
}

export async function addExpense(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const categoryId = id(data, "categoryId");
    const value = amount(data, "amount");
    const description = required(data, "description", 300);
    const spentAt = stamp(day(data, "spentAt"));
    const rawReceiptUrl = string(data, "receiptUrl");
    let receiptUrl: string | null = null;
    if (rawReceiptUrl) {
      const parsed = new URL(rawReceiptUrl);
      if (parsed.protocol !== "https:" || rawReceiptUrl.length > 1000) throw new Error("invalid");
      receiptUrl = parsed.toString();
    }
    await getDb().transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.expenses)
        .values({ categoryId, amount: value, description, spentAt, receiptUrl })
        .returning({ id: schema.expenses.id });
      await audit(tx, actor, "create", "expenses", row.id, {
        categoryId,
        amount: value,
        description,
        spentAt,
        receiptUrl,
      });
    });
  });
}

export async function addRotaDuty(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const memberId = id(data, "memberId");
    const dutyDate = day(data, "dutyDate");
    if (new Date(`${dutyDate}T12:00:00Z`).getUTCDay() !== 0) throw new Error("invalid");
    await getDb().transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.kitRota)
        .values({ memberId, dutyDate })
        .returning({ id: schema.kitRota.id });
      await audit(tx, actor, "create", "kit_rota", row.id, { memberId, dutyDate });
    });
  });
}

export async function updateRotaDuty(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const dutyId = id(data, "dutyId");
    const memberId = id(data, "memberId");
    const status = string(data, "status");
    if (!["scheduled", "done", "missed", "swapped"].includes(status)) throw new Error("invalid");
    const swappedWithMemberId = status === "swapped" ? id(data, "swappedWithMemberId") : null;
    await getDb().transaction(async (tx) => {
      const [row] = await tx
        .update(schema.kitRota)
        .set({
          memberId,
          status: status as "scheduled" | "done" | "missed" | "swapped",
          swappedWithMemberId,
        })
        .where(eq(schema.kitRota.id, dutyId))
        .returning({
          id: schema.kitRota.id,
          memberId: schema.kitRota.memberId,
          dutyDate: schema.kitRota.dutyDate,
        });
      if (!row || swappedWithMemberId === memberId) throw new Error("invalid");
      await audit(tx, actor, "update", "kit_rota", dutyId, {
        memberId,
        status,
        swappedWithMemberId,
      });
    });
  });
}

export async function addCategory(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const nameEn = required(data, "nameEn", 100);
    const nameFr = required(data, "nameFr", 100);
    await getDb().transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.expenseCategories)
        .values({ nameEn, nameFr })
        .returning({ id: schema.expenseCategories.id });
      await audit(tx, actor, "create", "expense_categories", row.id, { nameEn, nameFr });
    });
  });
}

export async function addFineReason(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const reasonEn = required(data, "reasonEn", 120);
    const reasonFr = required(data, "reasonFr", 120);
    const defaultAmount = amount(data, "defaultAmount");
    await getDb().transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.fineSchedule)
        .values({ reasonEn, reasonFr, defaultAmount })
        .returning({ id: schema.fineSchedule.id });
      await audit(tx, actor, "create", "fine_schedule", row.id, {
        reasonEn,
        reasonFr,
        defaultAmount,
      });
    });
  });
}

export async function voidRecord(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const recordId = id(data, "recordId");
    const table = required(data, "table", 20);
    const voidedReason = required(data, "reason", 300);
    const values = { voidedAt: new Date(), voidedBy: actor, voidedReason };
    await getDb().transaction(async (tx) => {
      if (table === "charges" || table === "payments") {
        const [entry] =
          table === "charges"
            ? await tx
                .select({ memberId: schema.charges.memberId })
                .from(schema.charges)
                .where(eq(schema.charges.id, recordId))
            : await tx
                .select({ memberId: schema.payments.memberId })
                .from(schema.payments)
                .where(eq(schema.payments.id, recordId));
        if (!entry) throw new Error("missing");
        await tx
          .select({ id: schema.members.id })
          .from(schema.members)
          .where(eq(schema.members.id, entry.memberId))
          .for("update");
      }
      let changed: { id: string }[];
      if (table === "charges")
        changed = await tx
          .update(schema.charges)
          .set(values)
          .where(
            sql`${schema.charges.id} = ${recordId}::uuid AND ${schema.charges.voidedAt} IS NULL`,
          )
          .returning({ id: schema.charges.id });
      else if (table === "payments")
        changed = await tx
          .update(schema.payments)
          .set(values)
          .where(
            sql`${schema.payments.id} = ${recordId}::uuid AND ${schema.payments.voidedAt} IS NULL`,
          )
          .returning({ id: schema.payments.id });
      else if (table === "expenses")
        changed = await tx
          .update(schema.expenses)
          .set(values)
          .where(
            sql`${schema.expenses.id} = ${recordId}::uuid AND ${schema.expenses.voidedAt} IS NULL`,
          )
          .returning({ id: schema.expenses.id });
      else throw new Error("invalid");
      if (!changed.length) throw new Error("missing");
      await audit(tx, actor, "void", table, recordId, { voidedReason });
    });
  });
}

export async function generateRota(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const startDate = day(data, "startDate");
    if (new Date(`${startDate}T12:00:00Z`).getUTCDay() !== 0) throw new Error("invalid");
    const weeks = Number(required(data, "weeks", 2));
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 26) throw new Error("invalid");
    await getDb().transaction(async (tx) => {
      const active = await tx
        .select({ id: schema.members.id })
        .from(schema.members)
        .where(eq(schema.members.isActive, true))
        .orderBy(schema.members.joinedAt, schema.members.id);
      if (!active.length) throw new Error("no members");
      const existing = await tx
        .select({ memberId: schema.kitRota.memberId, dutyDate: schema.kitRota.dutyDate })
        .from(schema.kitRota)
        .orderBy(schema.kitRota.dutyDate);
      const counts = new Map(active.map((member) => [member.id, 0]));
      for (const duty of existing)
        if (counts.has(duty.memberId)) counts.set(duty.memberId, counts.get(duty.memberId)! + 1);
      const occupied = new Set(existing.map((duty) => duty.dutyDate));
      for (let week = 0; week < weeks; week++) {
        const dateValue = new Date(`${startDate}T12:00:00Z`);
        dateValue.setUTCDate(dateValue.getUTCDate() + week * 7);
        const dutyDate = dateValue.toISOString().slice(0, 10);
        if (occupied.has(dutyDate)) continue;
        const member = active.reduce((best, next) =>
          counts.get(next.id)! < counts.get(best.id)! ? next : best,
        );
        const [row] = await tx
          .insert(schema.kitRota)
          .values({ dutyDate, memberId: member.id })
          .returning({ id: schema.kitRota.id });
        counts.set(member.id, counts.get(member.id)! + 1);
        await audit(tx, actor, "create", "kit_rota", row.id, {
          dutyDate,
          memberId: member.id,
          generated: true,
        });
      }
    });
  });
}

export async function updateMember(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const memberId = id(data, "memberId");
    const fullName = required(data, "fullName", 120);
    const joinedAt = day(data, "joinedAt");
    const phone = string(data, "phone");
    if (phone.length > 30) throw new Error("invalid");
    await getDb().transaction(async (tx) => {
      const [old] = await tx
        .select()
        .from(schema.members)
        .where(eq(schema.members.id, memberId))
        .for("update");
      if (!old) throw new Error("missing");
      const values = { fullName, joinedAt, phone: phone || null };
      await tx.update(schema.members).set(values).where(eq(schema.members.id, memberId));
      await tx.insert(schema.auditLog).values({
        actorId: actor,
        action: "update",
        tableName: "members",
        recordId: memberId,
        oldValues: { fullName: old.fullName, joinedAt: old.joinedAt, phone: old.phone },
        newValues: values,
      });
    });
  });
}

export async function deleteMember(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const memberId = id(data, "memberId");
    await getDb().transaction(async (tx) => {
      const [old] = await tx
        .select()
        .from(schema.members)
        .where(eq(schema.members.id, memberId))
        .for("update");
      if (!old) throw new Error("missing");
      const [history] = await tx
        .execute(
          sql`SELECT (
        EXISTS(SELECT 1 FROM charges WHERE member_id = ${memberId}::uuid) OR
        EXISTS(SELECT 1 FROM payments WHERE member_id = ${memberId}::uuid) OR
        EXISTS(SELECT 1 FROM kit_rota WHERE member_id = ${memberId}::uuid OR swapped_with_member_id = ${memberId}::uuid)
      ) AS has_history`,
        )
        .then((result) => result.rows);
      if (history.has_history) throw new Error("member-has-history");
      await tx.delete(schema.members).where(eq(schema.members.id, memberId));
      await tx.insert(schema.auditLog).values({
        actorId: actor,
        action: "delete",
        tableName: "members",
        recordId: memberId,
        oldValues: { fullName: old.fullName, joinedAt: old.joinedAt, phone: old.phone },
      });
    });
  });
}

export async function updateCharge(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const chargeId = id(data, "chargeId");
    const memberId = id(data, "memberId");
    const label = required(data, "label", 160);
    const value = amount(data, "amount");
    const dueDate = day(data, "dueDate");
    await getDb().transaction(async (tx) => {
      const [initial] = await tx
        .select({ memberId: schema.charges.memberId })
        .from(schema.charges)
        .where(eq(schema.charges.id, chargeId));
      if (!initial) throw new Error("missing");
      const lockedMembers = await tx
        .select({ id: schema.members.id })
        .from(schema.members)
        .where(inArray(schema.members.id, [...new Set([initial.memberId, memberId])]))
        .orderBy(schema.members.id)
        .for("update");
      if (lockedMembers.length !== new Set([initial.memberId, memberId]).size)
        throw new Error("missing");
      const [old] = await tx
        .select()
        .from(schema.charges)
        .where(eq(schema.charges.id, chargeId))
        .for("update");
      if (!old || old.voidedAt || old.memberId !== initial.memberId || dueDate < old.issuedOn)
        throw new Error("invalid");
      const [paid] = await tx
        .execute(
          sql`SELECT COALESCE(SUM(pa.amount), 0)::bigint AS value FROM payment_allocations pa JOIN payments p ON p.id = pa.payment_id WHERE pa.charge_id = ${chargeId}::uuid AND p.voided_at IS NULL`,
        )
        .then((result) => result.rows);
      if (value < Number(paid.value)) throw new Error("below-paid");
      if (memberId !== old.memberId) {
        const [linked] = await tx
          .execute(
            sql`SELECT EXISTS(SELECT 1 FROM payment_allocations WHERE charge_id = ${chargeId}::uuid) AS value`,
          )
          .then((result) => result.rows);
        if (linked.value) throw new Error("charge-has-payment");
      }
      const values = { memberId, label, amount: value, dueDate };
      await tx.update(schema.charges).set(values).where(eq(schema.charges.id, chargeId));
      await tx.insert(schema.auditLog).values({
        actorId: actor,
        action: "update",
        tableName: "charges",
        recordId: chargeId,
        oldValues: {
          memberId: old.memberId,
          label: old.label,
          amount: old.amount,
          dueDate: old.dueDate,
        },
        newValues: values,
      });
    });
  });
}

export async function updatePayment(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const paymentId = id(data, "paymentId");
    const value = amount(data, "amount");
    const paidAt = stamp(day(data, "paidAt"));
    const notes = string(data, "notes");
    if (notes.length > 500) throw new Error("invalid");
    await getDb().transaction(async (tx) => {
      const [initial] = await tx
        .select({ memberId: schema.payments.memberId })
        .from(schema.payments)
        .where(eq(schema.payments.id, paymentId));
      if (!initial) throw new Error("missing");
      await tx
        .select({ id: schema.members.id })
        .from(schema.members)
        .where(eq(schema.members.id, initial.memberId))
        .for("update");
      const [old] = await tx
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.id, paymentId))
        .for("update");
      if (!old || old.voidedAt) throw new Error("invalid");
      await tx
        .delete(schema.paymentAllocations)
        .where(eq(schema.paymentAllocations.paymentId, paymentId));
      const open = await tx.execute(
        sql`SELECT id, outstanding_amount FROM charge_balances WHERE member_id = ${old.memberId}::uuid AND outstanding_amount > 0 ORDER BY due_date, id`,
      );
      let remaining = value;
      for (const charge of open.rows) {
        if (remaining <= 0) break;
        const allocated = Math.min(remaining, Number(charge.outstanding_amount));
        await tx
          .insert(schema.paymentAllocations)
          .values({ paymentId, chargeId: String(charge.id), amount: allocated });
        remaining -= allocated;
      }
      const values = { amount: value, paidAt, notes: notes || null };
      await tx.update(schema.payments).set(values).where(eq(schema.payments.id, paymentId));
      await tx.insert(schema.auditLog).values({
        actorId: actor,
        action: "update",
        tableName: "payments",
        recordId: paymentId,
        oldValues: { amount: old.amount, paidAt: old.paidAt, notes: old.notes },
        newValues: { ...values, unallocated: remaining },
      });
    });
  });
}

export async function updateExpense(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const expenseId = id(data, "expenseId");
    const categoryId = id(data, "categoryId");
    const value = amount(data, "amount");
    const description = required(data, "description", 300);
    const spentAt = stamp(day(data, "spentAt"));
    const rawReceiptUrl = string(data, "receiptUrl");
    if (
      rawReceiptUrl.length > 1000 ||
      (rawReceiptUrl && new URL(rawReceiptUrl).protocol !== "https:")
    )
      throw new Error("invalid");
    const receiptUrl = rawReceiptUrl || null;
    await getDb().transaction(async (tx) => {
      const [old] = await tx
        .select()
        .from(schema.expenses)
        .where(eq(schema.expenses.id, expenseId))
        .for("update");
      if (!old || old.voidedAt) throw new Error("invalid");
      const values = { categoryId, amount: value, description, spentAt, receiptUrl };
      await tx.update(schema.expenses).set(values).where(eq(schema.expenses.id, expenseId));
      await tx.insert(schema.auditLog).values({
        actorId: actor,
        action: "update",
        tableName: "expenses",
        recordId: expenseId,
        oldValues: {
          categoryId: old.categoryId,
          amount: old.amount,
          description: old.description,
          spentAt: old.spentAt,
          receiptUrl: old.receiptUrl,
        },
        newValues: values,
      });
    });
  });
}

export async function deleteRotaDuty(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const dutyId = id(data, "dutyId");
    await getDb().transaction(async (tx) => {
      const [old] = await tx
        .delete(schema.kitRota)
        .where(eq(schema.kitRota.id, dutyId))
        .returning();
      if (!old) throw new Error("missing");
      await tx.insert(schema.auditLog).values({
        actorId: actor,
        action: "delete",
        tableName: "kit_rota",
        recordId: dutyId,
        oldValues: old,
      });
    });
  });
}

export async function updateCategory(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const categoryId = id(data, "categoryId");
    const nameEn = required(data, "nameEn", 100);
    const nameFr = required(data, "nameFr", 100);
    await getDb().transaction(async (tx) => {
      const [old] = await tx
        .select()
        .from(schema.expenseCategories)
        .where(eq(schema.expenseCategories.id, categoryId))
        .for("update");
      if (!old) throw new Error("missing");
      const values = { nameEn, nameFr };
      await tx
        .update(schema.expenseCategories)
        .set(values)
        .where(eq(schema.expenseCategories.id, categoryId));
      await tx.insert(schema.auditLog).values({
        actorId: actor,
        action: "update",
        tableName: "expense_categories",
        recordId: categoryId,
        oldValues: { nameEn: old.nameEn, nameFr: old.nameFr },
        newValues: values,
      });
    });
  });
}

export async function deleteCategory(_previous: ActionState, data: FormData): Promise<ActionState> {
  return run(async (actor) => {
    const categoryId = id(data, "categoryId");
    await getDb().transaction(async (tx) => {
      const [old] = await tx
        .delete(schema.expenseCategories)
        .where(eq(schema.expenseCategories.id, categoryId))
        .returning();
      if (!old) throw new Error("missing");
      await tx.insert(schema.auditLog).values({
        actorId: actor,
        action: "delete",
        tableName: "expense_categories",
        recordId: categoryId,
        oldValues: { nameEn: old.nameEn, nameFr: old.nameFr },
      });
    });
  });
}

export async function updateFineReason(
  _previous: ActionState,
  data: FormData,
): Promise<ActionState> {
  return run(async (actor) => {
    const reasonId = id(data, "reasonId");
    const reasonEn = required(data, "reasonEn", 120);
    const reasonFr = required(data, "reasonFr", 120);
    const defaultAmount = amount(data, "defaultAmount");
    const isActive = string(data, "isActive") === "true";
    await getDb().transaction(async (tx) => {
      const [old] = await tx
        .select()
        .from(schema.fineSchedule)
        .where(eq(schema.fineSchedule.id, reasonId))
        .for("update");
      if (!old) throw new Error("missing");
      const values = { reasonEn, reasonFr, defaultAmount, isActive };
      await tx.update(schema.fineSchedule).set(values).where(eq(schema.fineSchedule.id, reasonId));
      await tx.insert(schema.auditLog).values({
        actorId: actor,
        action: "update",
        tableName: "fine_schedule",
        recordId: reasonId,
        oldValues: {
          reasonEn: old.reasonEn,
          reasonFr: old.reasonFr,
          defaultAmount: old.defaultAmount,
          isActive: old.isActive,
        },
        newValues: values,
      });
    });
  });
}

export async function deleteFineReason(
  _previous: ActionState,
  data: FormData,
): Promise<ActionState> {
  return run(async (actor) => {
    const reasonId = id(data, "reasonId");
    await getDb().transaction(async (tx) => {
      const [old] = await tx
        .delete(schema.fineSchedule)
        .where(eq(schema.fineSchedule.id, reasonId))
        .returning();
      if (!old) throw new Error("missing");
      await tx.insert(schema.auditLog).values({
        actorId: actor,
        action: "delete",
        tableName: "fine_schedule",
        recordId: reasonId,
        oldValues: {
          reasonEn: old.reasonEn,
          reasonFr: old.reasonFr,
          defaultAmount: old.defaultAmount,
          isActive: old.isActive,
        },
      });
    });
  });
}
