CREATE TABLE "app_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"missed_duty_creates_fine" boolean DEFAULT false NOT NULL,
	"missed_duty_fine_schedule_id" uuid,
	CONSTRAINT "app_settings_singleton" CHECK ("app_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"table_name" text NOT NULL,
	"record_id" text NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"amount" integer NOT NULL,
	"issued_on" date NOT NULL,
	"due_date" date NOT NULL,
	"fine_schedule_id" uuid,
	"issued_by" text NOT NULL,
	"notes" text,
	"voided_at" timestamp with time zone,
	"voided_reason" text,
	"voided_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "charges_amount_positive" CHECK ("charges"."amount" > 0),
	CONSTRAINT "charges_type_valid" CHECK ("charges"."type" in ('dues', 'fine')),
	CONSTRAINT "charges_fine_requires_schedule" CHECK ("charges"."type" <> 'fine' or "charges"."fine_schedule_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_en" text NOT NULL,
	"name_fr" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spent_at" timestamp with time zone NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"description" text NOT NULL,
	"receipt_url" text,
	"voided_at" timestamp with time zone,
	"voided_reason" text,
	"voided_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_positive" CHECK ("expenses"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "fine_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reason_en" text NOT NULL,
	"reason_fr" text NOT NULL,
	"default_amount" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "fine_schedule_amount_positive" CHECK ("fine_schedule"."default_amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "kit_rota" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duty_date" date NOT NULL,
	"member_id" uuid NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"swapped_with_member_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kit_rota_status_valid" CHECK ("kit_rota"."status" in ('scheduled', 'done', 'missed', 'swapped')),
	CONSTRAINT "kit_rota_sunday" CHECK (extract(dow from "kit_rota"."duty_date") = 0)
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_at" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"charge_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	CONSTRAINT "payment_allocations_amount_positive" CHECK ("payment_allocations"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"receipt_number" bigint GENERATED ALWAYS AS IDENTITY (sequence name "payments_receipt_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"notes" text,
	"voided_at" timestamp with time zone,
	"voided_reason" text,
	"voided_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_missed_duty_fine_schedule_id_fine_schedule_id_fk" FOREIGN KEY ("missed_duty_fine_schedule_id") REFERENCES "public"."fine_schedule"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_fine_schedule_id_fine_schedule_id_fk" FOREIGN KEY ("fine_schedule_id") REFERENCES "public"."fine_schedule"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kit_rota" ADD CONSTRAINT "kit_rota_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kit_rota" ADD CONSTRAINT "kit_rota_swapped_with_member_id_members_id_fk" FOREIGN KEY ("swapped_with_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_charge_id_charges_id_fk" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_settings_fine_schedule_id_idx" ON "app_settings" USING btree ("missed_duty_fine_schedule_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "charges_member_id_idx" ON "charges" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "charges_due_date_idx" ON "charges" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "charges_fine_schedule_id_idx" ON "charges" USING btree ("fine_schedule_id");--> statement-breakpoint
CREATE UNIQUE INDEX "expense_categories_name_en_unique" ON "expense_categories" USING btree ("name_en");--> statement-breakpoint
CREATE INDEX "expenses_category_id_idx" ON "expenses" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "expenses_spent_at_idx" ON "expenses" USING btree ("spent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "kit_rota_duty_date_unique" ON "kit_rota" USING btree ("duty_date");--> statement-breakpoint
CREATE INDEX "kit_rota_member_id_idx" ON "kit_rota" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "kit_rota_swapped_with_member_id_idx" ON "kit_rota" USING btree ("swapped_with_member_id");--> statement-breakpoint
CREATE INDEX "members_joined_at_idx" ON "members" USING btree ("joined_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_allocations_pair_unique" ON "payment_allocations" USING btree ("payment_id","charge_id");--> statement-breakpoint
CREATE INDEX "payment_allocations_payment_id_idx" ON "payment_allocations" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_allocations_charge_id_idx" ON "payment_allocations" USING btree ("charge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_receipt_number_unique" ON "payments" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX "payments_member_id_idx" ON "payments" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "payments_paid_at_idx" ON "payments" USING btree ("paid_at");