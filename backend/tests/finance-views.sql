-- Run only on an empty disposable database after applying all migrations.
-- The transaction is always rolled back; no fixture data is retained.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM members) OR EXISTS (SELECT 1 FROM payments) OR EXISTS (SELECT 1 FROM expenses) THEN
    RAISE EXCEPTION 'Finance view tests require an empty disposable database';
  END IF;
END $$;
INSERT INTO members (id, full_name, joined_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Member', CURRENT_DATE);
INSERT INTO expense_categories (id, name_en, name_fr)
VALUES ('00000000-0000-0000-0000-000000000002', 'Test category', 'Catégorie de test');
INSERT INTO charges (id, member_id, type, label, amount, issued_on, due_date, issued_by)
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'dues', 'Test dues', 10000, CURRENT_DATE, CURRENT_DATE - 1, 'test');
INSERT INTO payments (id, member_id, amount, paid_at)
VALUES ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 5000, NOW());
INSERT INTO payment_allocations (payment_id, charge_id, amount)
VALUES ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 5000);
INSERT INTO expenses (spent_at, category_id, amount, description)
VALUES (NOW(), '00000000-0000-0000-0000-000000000002', 2000, 'Test expense');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM finance_totals WHERE total_collected = 5000 AND total_spent = 2000 AND balance = 3000 AND total_outstanding = 5000 AND dues_collected = 5000) THEN
    RAISE EXCEPTION 'Finance totals do not match the fixture';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM member_balances WHERE id = '00000000-0000-0000-0000-000000000001' AND outstanding_amount = 5000 AND status = 'overdue') THEN
    RAISE EXCEPTION 'Overdue member status is incorrect';
  END IF;
END $$;
-- A fully paid charge plus a separate future unpaid charge must still be partial.
UPDATE charges SET amount = 5000, due_date = CURRENT_DATE + 30 WHERE id = '00000000-0000-0000-0000-000000000003';
INSERT INTO charges (member_id, type, label, amount, issued_on, due_date, issued_by)
VALUES ('00000000-0000-0000-0000-000000000001', 'dues', 'Future dues', 5000, CURRENT_DATE, CURRENT_DATE + 30, 'test');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM member_balances WHERE id = '00000000-0000-0000-0000-000000000001' AND status = 'partial') THEN
    RAISE EXCEPTION 'Partial member status is incorrect';
  END IF;
END $$;
UPDATE payments SET voided_at = NOW(), voided_reason = 'Test', voided_by = 'test' WHERE id = '00000000-0000-0000-0000-000000000004';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM finance_totals WHERE total_collected = 0 AND balance = -2000 AND total_outstanding = 10000 AND dues_collected = 0) THEN
    RAISE EXCEPTION 'Voided payments are included in totals or allocations';
  END IF;
END $$;
INSERT INTO "user" (id, name, email, email_verified) VALUES ('treasurer', 'Test treasurer', 'test@example.invalid', true);
DO $$ BEGIN
  BEGIN
    INSERT INTO "user" (id, name, email) VALUES ('another-user', 'Test visitor', 'visitor@example.invalid');
    RAISE EXCEPTION 'A second account was allowed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
ROLLBACK;
