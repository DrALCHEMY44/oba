import * as mock from "./mock-data";
import { sql, type SQL } from "drizzle-orm";
import { getDb } from "./index";

async function rows<T>(query: SQL): Promise<T[]> {
  const result = await getDb().execute(query);
  return result.rows as T[];
}

const configured = () => Boolean(process.env.DATABASE_URL);
const money = (value: unknown) => Number(value ?? 0);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FinanceTotals = {
  totalCollected: number;
  totalSpent: number;
  totalOutstanding: number;
  duesCollected: number;
  finesCollected: number;
  balance: number;
};

export async function getFinanceTotals(): Promise<FinanceTotals | null> {
  if (!configured()) return mock.financeTotals;
  const [row] = await rows<Record<string, unknown>>(sql`SELECT * FROM finance_totals`);
  return {
    totalCollected: money(row.total_collected),
    totalSpent: money(row.total_spent),
    totalOutstanding: money(row.total_outstanding),
    duesCollected: money(row.dues_collected),
    finesCollected: money(row.fines_collected),
    balance: money(row.balance),
  };
}

export type Expense = {
  id: string;
  spentAt: Date;
  amount: number;
  description: string;
  categoryId: string;
  categoryEn: string;
  categoryFr: string;
  receiptUrl: string | null;
};

export async function getExpenses(
  filters: { month?: string; categoryId?: string; limit?: number; offset?: number } = {},
): Promise<Expense[] | null> {
  if (!configured()) {
    const filtered = mock.expenses.filter(
      (expense) =>
        (!filters.month || expense.spentAt.toISOString().slice(0, 7) === filters.month) &&
        (!filters.categoryId || expense.categoryId === filters.categoryId),
    );
    return filtered
      .slice()
      .sort((a, b) => b.spentAt.getTime() - a.spentAt.getTime())
      .slice(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 200));
  }
  const month = filters.month && /^\d{4}-\d{2}$/.test(filters.month) ? filters.month : null;
  const categoryId =
    filters.categoryId && uuidPattern.test(filters.categoryId) ? filters.categoryId : null;
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 500);
  const offset = Math.min(Math.max(filters.offset ?? 0, 0), 100000);
  const data = await rows<Record<string, unknown>>(sql`
    SELECT e.id, e.spent_at, e.amount, e.description, e.receipt_url, ec.id AS category_id,
           ec.name_en AS category_en, ec.name_fr AS category_fr
    FROM expenses e JOIN expense_categories ec ON ec.id = e.category_id
    WHERE e.voided_at IS NULL
      AND (${month}::text IS NULL OR to_char(e.spent_at AT TIME ZONE 'Africa/Douala', 'YYYY-MM') = ${month})
      AND (${categoryId}::uuid IS NULL OR e.category_id = ${categoryId}::uuid)
    ORDER BY e.spent_at DESC, e.id DESC LIMIT ${limit} OFFSET ${offset}`);
  return data.map((row) => ({
    id: String(row.id),
    spentAt: new Date(String(row.spent_at)),
    amount: money(row.amount),
    description: String(row.description),
    categoryId: String(row.category_id),
    categoryEn: String(row.category_en),
    categoryFr: String(row.category_fr),
    receiptUrl: row.receipt_url ? String(row.receipt_url) : null,
  }));
}

export async function getExpenseCategories(): Promise<
  { id: string; nameEn: string; nameFr: string }[] | null
> {
  if (!configured()) return mock.categories;
  const data = await rows<Record<string, unknown>>(
    sql`SELECT id, name_en, name_fr FROM expense_categories ORDER BY name_en`,
  );
  return data.map((row) => ({
    id: String(row.id),
    nameEn: String(row.name_en),
    nameFr: String(row.name_fr),
  }));
}

export type Member = {
  id: string;
  fullName: string;
  isActive: boolean;
  outstandingAmount: number;
  duesOutstanding: number;
  finesOutstanding: number;
  status: "up_to_date" | "partial" | "overdue";
};

export async function getMembers(): Promise<Member[] | null> {
  if (!configured()) return mock.members;
  const data = await rows<Record<string, unknown>>(
    sql`SELECT * FROM member_balances ORDER BY full_name`,
  );
  return data.map((row) => ({
    id: String(row.id),
    fullName: String(row.full_name),
    isActive: Boolean(row.is_active),
    outstandingAmount: money(row.outstanding_amount),
    duesOutstanding: money(row.dues_outstanding),
    finesOutstanding: money(row.fines_outstanding),
    status: String(row.status) as Member["status"],
  }));
}

export type Charge = {
  id: string;
  type: "dues" | "fine";
  label: string;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  issuedOn: string;
  dueDate: string;
  reasonEn: string | null;
  reasonFr: string | null;
};

export async function getMemberDetails(id: string) {
  if (!configured()) return mock.memberDetails(id);
  if (!uuidPattern.test(id)) return { member: null, charges: [], payments: [], duties: [] };
  const [members, chargeRows, paymentRows, dutyRows] = await Promise.all([
    rows<Record<string, unknown>>(sql`SELECT * FROM member_balances WHERE id = ${id}::uuid`),
    rows<Record<string, unknown>>(sql`
      SELECT cb.*, fs.reason_en, fs.reason_fr FROM charge_balances cb
      LEFT JOIN fine_schedule fs ON fs.id = cb.fine_schedule_id
      WHERE cb.member_id = ${id}::uuid ORDER BY cb.due_date DESC, cb.id`),
    rows<Record<string, unknown>>(
      sql`SELECT id, amount, paid_at, receipt_number FROM payments WHERE member_id = ${id}::uuid AND voided_at IS NULL ORDER BY paid_at DESC`,
    ),
    rows<Record<string, unknown>>(
      sql`SELECT duty_date, status, notes FROM kit_rota WHERE member_id = ${id}::uuid ORDER BY duty_date DESC`,
    ),
  ]);
  const memberRow = members[0];
  return {
    member: memberRow
      ? {
          id: String(memberRow.id),
          fullName: String(memberRow.full_name),
          isActive: Boolean(memberRow.is_active),
          outstandingAmount: money(memberRow.outstanding_amount),
          duesOutstanding: money(memberRow.dues_outstanding),
          finesOutstanding: money(memberRow.fines_outstanding),
          status: String(memberRow.status) as Member["status"],
        }
      : null,
    charges: chargeRows.map((row): Charge => ({
      id: String(row.id),
      type: String(row.type) as Charge["type"],
      label: String(row.label),
      amount: money(row.amount),
      paidAmount: money(row.paid_amount),
      outstandingAmount: money(row.outstanding_amount),
      issuedOn: String(row.issued_on),
      dueDate: String(row.due_date),
      reasonEn: row.reason_en ? String(row.reason_en) : null,
      reasonFr: row.reason_fr ? String(row.reason_fr) : null,
    })),
    payments: paymentRows.map((row) => ({
      id: String(row.id),
      amount: money(row.amount),
      paidAt: new Date(String(row.paid_at)),
      receiptNumber: String(row.receipt_number),
    })),
    duties: dutyRows.map((row) => ({
      dutyDate: String(row.duty_date),
      status: String(row.status),
      notes: row.notes ? String(row.notes) : null,
    })),
  };
}

export async function getFineReasons(): Promise<
  { id: string; reasonEn: string; reasonFr: string; defaultAmount: number }[] | null
> {
  if (!configured()) return mock.fineReasons;
  const data = await rows<Record<string, unknown>>(
    sql`SELECT id, reason_en, reason_fr, default_amount FROM fine_schedule WHERE is_active = true ORDER BY reason_en`,
  );
  return data.map((row) => ({
    id: String(row.id),
    reasonEn: String(row.reason_en),
    reasonFr: String(row.reason_fr),
    defaultAmount: money(row.default_amount),
  }));
}

export async function getFines() {
  if (!configured())
    return mock.charges
      .filter((charge) => charge.type === "fine")
      .map((charge) => ({
        id: charge.id,
        label: charge.label,
        memberId: charge.memberId,
        memberName: mock.members.find((member) => member.id === charge.memberId)!.fullName,
        issuedOn: charge.issuedOn,
        dueDate: charge.dueDate,
        amount: charge.amount,
        paidAmount: charge.paidAmount,
        outstandingAmount: charge.amount - charge.paidAmount,
        reasonEn: charge.reasonEn ?? "",
        reasonFr: charge.reasonFr ?? "",
      }));
  const data = await rows<Record<string, unknown>>(sql`
    SELECT cb.id, cb.label, cb.member_id, m.full_name, cb.issued_on, cb.due_date, cb.amount, cb.paid_amount, cb.outstanding_amount,
           fs.reason_en, fs.reason_fr
    FROM charge_balances cb JOIN members m ON m.id = cb.member_id
    LEFT JOIN fine_schedule fs ON fs.id = cb.fine_schedule_id
    WHERE cb.type = 'fine' ORDER BY cb.issued_on DESC, cb.id DESC`);
  return data.map((row) => ({
    id: String(row.id),
    label: String(row.label),
    memberId: String(row.member_id),
    memberName: String(row.full_name),
    issuedOn: String(row.issued_on),
    dueDate: String(row.due_date),
    amount: money(row.amount),
    paidAmount: money(row.paid_amount),
    outstandingAmount: money(row.outstanding_amount),
    reasonEn: String(row.reason_en ?? ""),
    reasonFr: String(row.reason_fr ?? ""),
  }));
}

export async function getRota() {
  if (!configured()) return mock.duties;
  const data = await rows<Record<string, unknown>>(sql`
    SELECT kr.id, kr.duty_date, kr.status, kr.notes, m.full_name, sw.full_name AS swapped_with
    FROM kit_rota kr JOIN members m ON m.id = kr.member_id
    LEFT JOIN members sw ON sw.id = kr.swapped_with_member_id
    ORDER BY kr.duty_date DESC`);
  return data.map((row) => ({
    id: String(row.id),
    dutyDate: String(row.duty_date),
    status: String(row.status),
    notes: row.notes ? String(row.notes) : null,
    memberName: String(row.full_name),
    swappedWith: row.swapped_with ? String(row.swapped_with) : null,
  }));
}

export async function getMonthlyCashFlow() {
  if (!configured()) return mock.monthlyCashFlow;
  const data = await rows<Record<string, unknown>>(
    sql`SELECT month, collected, spent FROM monthly_cash_flow ORDER BY month`,
  );
  return data.map((row) => ({
    month: String(row.month),
    collected: money(row.collected),
    spent: money(row.spent),
  }));
}

export async function getExpensesByCategory() {
  if (!configured()) return mock.expensesByCategory;
  const data = await rows<Record<string, unknown>>(
    sql`SELECT * FROM expenses_by_category ORDER BY total_spent DESC`,
  );
  return data.map((row) => ({
    categoryId: String(row.category_id),
    nameEn: String(row.name_en),
    nameFr: String(row.name_fr),
    totalSpent: money(row.total_spent),
  }));
}

export type PaymentDetail = {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  paidAt: Date;
  receiptNumber: string;
  notes: string | null;
  allocations: { label: string; type: "dues" | "fine"; amount: number }[];
  unallocated: number;
};

export async function getPayments(
  filters: { limit?: number; offset?: number } = {},
): Promise<PaymentDetail[] | null> {
  const limit = Math.min(Math.max(filters.limit ?? 21, 1), 100);
  const offset = Math.min(Math.max(filters.offset ?? 0, 0), 100000);
  if (!configured())
    return mock.payments
      .slice()
      .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())
      .slice(offset, offset + limit)
      .map((payment) => {
        const fine = payment.id === "00000000-0000-4000-8000-000000000310";
        const charge = mock.charges.find(
          (item) => item.memberId === payment.memberId && item.type === (fine ? "fine" : "dues"),
        );
        return {
          ...payment,
          memberName: mock.members.find((member) => member.id === payment.memberId)!.fullName,
          notes: null,
          allocations: charge
            ? [{ label: charge.label, type: charge.type, amount: payment.amount }]
            : [],
          unallocated: charge ? 0 : payment.amount,
        };
      });
  const data = await rows<Record<string, unknown>>(sql`
    SELECT p.id, p.member_id, m.full_name, p.amount, p.paid_at, p.receipt_number, p.notes,
           COALESCE((SELECT json_agg(json_build_object('label', c.label, 'type', c.type, 'amount', pa.amount) ORDER BY c.due_date, c.id)
                     FROM payment_allocations pa JOIN charges c ON c.id = pa.charge_id
                     WHERE pa.payment_id = p.id AND c.voided_at IS NULL), '[]'::json) AS allocations
    FROM payments p JOIN members m ON m.id = p.member_id
    WHERE p.voided_at IS NULL
    ORDER BY p.paid_at DESC, p.id DESC LIMIT ${limit} OFFSET ${offset}`);
  return data.map((row) => {
    const allocations = (
      row.allocations as { label: string; type: "dues" | "fine"; amount: number }[]
    ).map((item) => ({ ...item, amount: money(item.amount) }));
    const amount = money(row.amount);
    return {
      id: String(row.id),
      memberId: String(row.member_id),
      memberName: String(row.full_name),
      amount,
      paidAt: new Date(String(row.paid_at)),
      receiptNumber: String(row.receipt_number),
      notes: row.notes ? String(row.notes) : null,
      allocations,
      unallocated: amount - allocations.reduce((sum, item) => sum + item.amount, 0),
    };
  });
}

export type EntryKind = "payment" | "expense" | "dues" | "fine" | "duty" | "member";
export type AssociationEntry = {
  id: string;
  kind: EntryKind;
  occurredAt: Date;
  calendarDate: string | null;
  amount: number | null;
  memberId: string | null;
  memberName: string | null;
  label: string | null;
  categoryEn: string | null;
  categoryFr: string | null;
  reasonEn: string | null;
  reasonFr: string | null;
  receiptNumber: string | null;
  status: string | null;
};

export async function getEntries(
  filters: { kind?: string; month?: string; limit?: number; offset?: number } = {},
): Promise<AssociationEntry[] | null> {
  const kind = (["payment", "expense", "dues", "fine", "duty", "member"] as const).includes(
    filters.kind as EntryKind,
  )
    ? filters.kind
    : null;
  const month =
    filters.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(filters.month) ? filters.month : null;
  const limit = Math.min(Math.max(filters.limit ?? 26, 1), 100);
  const offset = Math.min(Math.max(filters.offset ?? 0, 0), 100000);
  if (!configured()) {
    const midnight = (value: string) => new Date(`${value}T00:00:00+01:00`);
    const rows: AssociationEntry[] = [
      ...mock.payments.map((item) => ({
        id: item.id,
        kind: "payment" as const,
        occurredAt: item.paidAt,
        calendarDate: null,
        amount: item.amount,
        memberId: item.memberId,
        memberName: mock.members.find((member) => member.id === item.memberId)!.fullName,
        label: null,
        categoryEn: null,
        categoryFr: null,
        reasonEn: null,
        reasonFr: null,
        receiptNumber: item.receiptNumber,
        status: null,
      })),
      ...mock.expenses.map((item) => ({
        id: item.id,
        kind: "expense" as const,
        occurredAt: item.spentAt,
        calendarDate: null,
        amount: item.amount,
        memberId: null,
        memberName: null,
        label: item.description,
        categoryEn: item.categoryEn,
        categoryFr: item.categoryFr,
        reasonEn: null,
        reasonFr: null,
        receiptNumber: null,
        status: null,
      })),
      ...mock.charges.map((item) => ({
        id: item.id,
        kind: item.type,
        occurredAt: midnight(item.issuedOn),
        calendarDate: item.issuedOn,
        amount: item.amount,
        memberId: item.memberId,
        memberName: mock.members.find((member) => member.id === item.memberId)!.fullName,
        label: item.label,
        categoryEn: null,
        categoryFr: null,
        reasonEn: item.reasonEn,
        reasonFr: item.reasonFr,
        receiptNumber: null,
        status: null,
      })),
      ...mock.duties.map((item) => ({
        id: item.id,
        kind: "duty" as const,
        occurredAt: midnight(item.dutyDate),
        calendarDate: item.dutyDate,
        amount: null,
        memberId: item.memberId,
        memberName: item.memberName,
        label: null,
        categoryEn: null,
        categoryFr: null,
        reasonEn: null,
        reasonFr: null,
        receiptNumber: null,
        status: item.status,
      })),
      ...mock.members.map((item) => ({
        id: item.id,
        kind: "member" as const,
        occurredAt: midnight(item.joinedAt),
        calendarDate: item.joinedAt,
        amount: null,
        memberId: item.id,
        memberName: item.fullName,
        label: null,
        categoryEn: null,
        categoryFr: null,
        reasonEn: null,
        reasonFr: null,
        receiptNumber: null,
        status: null,
      })),
    ];
    return rows
      .filter(
        (item) =>
          (!kind || item.kind === kind) &&
          (!month ||
            new Intl.DateTimeFormat("sv-SE", {
              timeZone: "Africa/Douala",
              year: "numeric",
              month: "2-digit",
            }).format(item.occurredAt) === month),
      )
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime() || b.id.localeCompare(a.id))
      .slice(offset, offset + limit);
  }
  const data = await rows<Record<string, unknown>>(sql`
    WITH entries AS (
      SELECT p.id, 'payment'::text AS kind, p.paid_at AS occurred_at, NULL::text AS calendar_date, p.amount::bigint AS amount,
             m.id AS member_id, m.full_name AS member_name, NULL::text AS label, NULL::text AS category_en, NULL::text AS category_fr,
             NULL::text AS reason_en, NULL::text AS reason_fr, p.receipt_number::text AS receipt_number, NULL::text AS status
      FROM payments p JOIN members m ON m.id = p.member_id WHERE p.voided_at IS NULL
      UNION ALL
      SELECT e.id, 'expense'::text, e.spent_at, NULL::text, e.amount::bigint, NULL::uuid, NULL::text, e.description,
             ec.name_en, ec.name_fr, NULL::text, NULL::text, NULL::text, NULL::text
      FROM expenses e JOIN expense_categories ec ON ec.id = e.category_id WHERE e.voided_at IS NULL
      UNION ALL
      SELECT c.id, c.type, c.issued_on::timestamp AT TIME ZONE 'Africa/Douala', c.issued_on::text, c.amount::bigint,
             m.id, m.full_name, c.label, NULL::text, NULL::text, fs.reason_en, fs.reason_fr, NULL::text, NULL::text
      FROM charges c JOIN members m ON m.id = c.member_id LEFT JOIN fine_schedule fs ON fs.id = c.fine_schedule_id WHERE c.voided_at IS NULL
      UNION ALL
      SELECT kr.id, 'duty'::text, kr.duty_date::timestamp AT TIME ZONE 'Africa/Douala', kr.duty_date::text, NULL::bigint,
             m.id, m.full_name, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, kr.status
      FROM kit_rota kr JOIN members m ON m.id = kr.member_id
      UNION ALL
      SELECT m.id, 'member'::text, m.joined_at::timestamp AT TIME ZONE 'Africa/Douala', m.joined_at::text, NULL::bigint,
             m.id, m.full_name, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text
      FROM members m
    )
    SELECT * FROM entries
    WHERE (${kind}::text IS NULL OR kind = ${kind})
      AND (${month}::text IS NULL OR to_char(occurred_at AT TIME ZONE 'Africa/Douala', 'YYYY-MM') = ${month})
    ORDER BY occurred_at DESC, kind, id DESC LIMIT ${limit} OFFSET ${offset}`);
  return data.map((row) => ({
    id: String(row.id),
    kind: String(row.kind) as EntryKind,
    occurredAt: new Date(String(row.occurred_at)),
    calendarDate: row.calendar_date ? String(row.calendar_date) : null,
    amount: row.amount === null ? null : money(row.amount),
    memberId: row.member_id ? String(row.member_id) : null,
    memberName: row.member_name ? String(row.member_name) : null,
    label: row.label ? String(row.label) : null,
    categoryEn: row.category_en ? String(row.category_en) : null,
    categoryFr: row.category_fr ? String(row.category_fr) : null,
    reasonEn: row.reason_en ? String(row.reason_en) : null,
    reasonFr: row.reason_fr ? String(row.reason_fr) : null,
    receiptNumber: row.receipt_number ? String(row.receipt_number) : null,
    status: row.status ? String(row.status) : null,
  }));
}
