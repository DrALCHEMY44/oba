-- Custom SQL migration file, put your code below! --
CREATE VIEW charge_balances AS
SELECT c.id, c.member_id, c.type, c.label, c.amount, c.issued_on, c.due_date,
       c.fine_schedule_id, c.notes,
       COALESCE(SUM(CASE WHEN p.id IS NOT NULL THEN pa.amount ELSE 0 END), 0)::bigint AS paid_amount,
       (c.amount - COALESCE(SUM(CASE WHEN p.id IS NOT NULL THEN pa.amount ELSE 0 END), 0))::bigint AS outstanding_amount
FROM charges c
LEFT JOIN payment_allocations pa ON pa.charge_id = c.id
LEFT JOIN payments p ON p.id = pa.payment_id AND p.voided_at IS NULL
WHERE c.voided_at IS NULL
GROUP BY c.id;
--> statement-breakpoint
CREATE VIEW member_balances AS
SELECT m.id, m.full_name, m.is_active,
       COALESCE(SUM(cb.outstanding_amount), 0)::bigint AS outstanding_amount,
       COALESCE(SUM(cb.outstanding_amount) FILTER (WHERE cb.type = 'dues'), 0)::bigint AS dues_outstanding,
       COALESCE(SUM(cb.outstanding_amount) FILTER (WHERE cb.type = 'fine'), 0)::bigint AS fines_outstanding,
       CASE
         WHEN COUNT(cb.id) FILTER (WHERE cb.due_date < (now() AT TIME ZONE 'Africa/Douala')::date AND cb.outstanding_amount > 0) > 0 THEN 'overdue'
         WHEN COALESCE(SUM(cb.paid_amount), 0) > 0 AND COALESCE(SUM(cb.outstanding_amount), 0) > 0 THEN 'partial'
         ELSE 'up_to_date'
       END AS status
FROM members m
LEFT JOIN charge_balances cb ON cb.member_id = m.id
GROUP BY m.id;
--> statement-breakpoint
CREATE VIEW finance_totals AS
SELECT
  (SELECT COALESCE(SUM(amount), 0)::bigint FROM payments WHERE voided_at IS NULL) AS total_collected,
  (SELECT COALESCE(SUM(amount), 0)::bigint FROM expenses WHERE voided_at IS NULL) AS total_spent,
  (SELECT COALESCE(SUM(outstanding_amount), 0)::bigint FROM charge_balances) AS total_outstanding,
  (SELECT COALESCE(SUM(pa.amount), 0)::bigint FROM payment_allocations pa JOIN payments p ON p.id = pa.payment_id JOIN charges c ON c.id = pa.charge_id WHERE p.voided_at IS NULL AND c.voided_at IS NULL AND c.type = 'dues') AS dues_collected,
  (SELECT COALESCE(SUM(pa.amount), 0)::bigint FROM payment_allocations pa JOIN payments p ON p.id = pa.payment_id JOIN charges c ON c.id = pa.charge_id WHERE p.voided_at IS NULL AND c.voided_at IS NULL AND c.type = 'fine') AS fines_collected,
  ((SELECT COALESCE(SUM(amount), 0)::bigint FROM payments WHERE voided_at IS NULL) -
   (SELECT COALESCE(SUM(amount), 0)::bigint FROM expenses WHERE voided_at IS NULL)) AS balance;
--> statement-breakpoint
CREATE VIEW monthly_cash_flow AS
WITH income AS (
  SELECT date_trunc('month', paid_at AT TIME ZONE 'Africa/Douala')::date AS month, SUM(amount)::bigint AS collected
  FROM payments WHERE voided_at IS NULL GROUP BY 1
), spending AS (
  SELECT date_trunc('month', spent_at AT TIME ZONE 'Africa/Douala')::date AS month, SUM(amount)::bigint AS spent
  FROM expenses WHERE voided_at IS NULL GROUP BY 1
)
SELECT COALESCE(i.month, s.month) AS month, COALESCE(i.collected, 0)::bigint AS collected,
       COALESCE(s.spent, 0)::bigint AS spent
FROM income i FULL JOIN spending s USING (month);
--> statement-breakpoint
CREATE VIEW expenses_by_category AS
SELECT ec.id AS category_id, ec.name_en, ec.name_fr,
       COALESCE(SUM(e.amount) FILTER (WHERE e.voided_at IS NULL), 0)::bigint AS total_spent
FROM expense_categories ec LEFT JOIN expenses e ON e.category_id = ec.id
GROUP BY ec.id;
