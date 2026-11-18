import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").defaultRandom().primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const members = pgTable(
  "members",
  {
    id: id(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    isActive: boolean("is_active").notNull().default(true),
    joinedAt: date("joined_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("members_joined_at_idx").on(t.joinedAt)],
);

export const fineSchedule = pgTable(
  "fine_schedule",
  {
    id: id(),
    reasonEn: text("reason_en").notNull(),
    reasonFr: text("reason_fr").notNull(),
    defaultAmount: integer("default_amount").notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [check("fine_schedule_amount_positive", sql`${t.defaultAmount} > 0`)],
);

export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: id(),
    nameEn: text("name_en").notNull(),
    nameFr: text("name_fr").notNull(),
  },
  (t) => [uniqueIndex("expense_categories_name_en_unique").on(t.nameEn)],
);

export const charges = pgTable(
  "charges",
  {
    id: id(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    type: text("type", { enum: ["dues", "fine"] }).notNull(),
    label: text("label").notNull(),
    amount: integer("amount").notNull(),
    issuedOn: date("issued_on").notNull(),
    dueDate: date("due_date").notNull(),
    fineScheduleId: uuid("fine_schedule_id").references(() => fineSchedule.id),
    issuedBy: text("issued_by").notNull(),
    notes: text("notes"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedReason: text("voided_reason"),
    voidedBy: text("voided_by"),
    createdAt: createdAt(),
  },
  (t) => [
    check("charges_amount_positive", sql`${t.amount} > 0`),
    check("charges_type_valid", sql`${t.type} in ('dues', 'fine')`),
    check(
      "charges_fine_requires_schedule",
      sql`${t.type} <> 'fine' or ${t.fineScheduleId} is not null`,
    ),
    index("charges_member_id_idx").on(t.memberId),
    index("charges_due_date_idx").on(t.dueDate),
    index("charges_fine_schedule_id_idx").on(t.fineScheduleId),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    amount: integer("amount").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    receiptNumber: bigint("receipt_number", { mode: "number" }).generatedAlwaysAsIdentity(),
    notes: text("notes"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedReason: text("voided_reason"),
    voidedBy: text("voided_by"),
    createdAt: createdAt(),
  },
  (t) => [
    check("payments_amount_positive", sql`${t.amount} > 0`),
    uniqueIndex("payments_receipt_number_unique").on(t.receiptNumber),
    index("payments_member_id_idx").on(t.memberId),
    index("payments_paid_at_idx").on(t.paidAt),
  ],
);

export const paymentAllocations = pgTable(
  "payment_allocations",
  {
    id: id(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id),
    chargeId: uuid("charge_id")
      .notNull()
      .references(() => charges.id),
    amount: integer("amount").notNull(),
  },
  (t) => [
    check("payment_allocations_amount_positive", sql`${t.amount} > 0`),
    uniqueIndex("payment_allocations_pair_unique").on(t.paymentId, t.chargeId),
    index("payment_allocations_payment_id_idx").on(t.paymentId),
    index("payment_allocations_charge_id_idx").on(t.chargeId),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: id(),
    spentAt: timestamp("spent_at", { withTimezone: true }).notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => expenseCategories.id),
    amount: integer("amount").notNull(),
    description: text("description").notNull(),
    receiptUrl: text("receipt_url"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedReason: text("voided_reason"),
    voidedBy: text("voided_by"),
    createdAt: createdAt(),
  },
  (t) => [
    check("expenses_amount_positive", sql`${t.amount} > 0`),
    index("expenses_category_id_idx").on(t.categoryId),
    index("expenses_spent_at_idx").on(t.spentAt),
  ],
);

export const kitRota = pgTable(
  "kit_rota",
  {
    id: id(),
    dutyDate: date("duty_date").notNull(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    status: text("status", { enum: ["scheduled", "done", "missed", "swapped"] })
      .notNull()
      .default("scheduled"),
    swappedWithMemberId: uuid("swapped_with_member_id").references(() => members.id),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [
    check("kit_rota_status_valid", sql`${t.status} in ('scheduled', 'done', 'missed', 'swapped')`),
    check("kit_rota_sunday", sql`extract(dow from ${t.dutyDate}) = 0`),
    uniqueIndex("kit_rota_duty_date_unique").on(t.dutyDate),
    index("kit_rota_member_id_idx").on(t.memberId),
    index("kit_rota_swapped_with_member_id_idx").on(t.swappedWithMemberId),
  ],
);

export const appSettings = pgTable(
  "app_settings",
  {
    id: integer("id").primaryKey().default(1),
    missedDutyCreatesFine: boolean("missed_duty_creates_fine").notNull().default(false),
    missedDutyFineScheduleId: uuid("missed_duty_fine_schedule_id").references(
      () => fineSchedule.id,
    ),
  },
  (t) => [
    check("app_settings_singleton", sql`${t.id} = 1`),
    index("app_settings_fine_schedule_id_idx").on(t.missedDutyFineScheduleId),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    tableName: text("table_name").notNull(),
    recordId: text("record_id").notNull(),
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_log_actor_id_idx").on(t.actorId),
    index("audit_log_created_at_idx").on(t.createdAt),
  ],
);
