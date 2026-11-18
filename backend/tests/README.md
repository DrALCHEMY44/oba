# SQL integration checks

Apply all checked-in migrations to an empty disposable PostgreSQL database. Then run `psql -X -v ON_ERROR_STOP=1 -d disposable_database -f backend/tests/finance-views.sql` from the repository root (add your local connection options as needed).

The script refuses databases containing finance data. It verifies collected/spent/balance totals, outstanding amounts, overdue and partial member statuses, voided-payment exclusions, and the single-treasurer account constraint. It rolls the fixture back at the end.
