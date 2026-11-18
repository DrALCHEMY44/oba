# Association finances

Mobile-first finance app for a basketball association in Cameroon, with French/English public records and a protected treasurer account. The public modules are dashboard, members, payment receipts, expenses, fines, Sunday kit rota, and finance summary. See `DESIGN.md` for the interface direction.

## Repository layout

| Folder      | Purpose                                                             | Hosting                                                                       |
| ----------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `frontend/` | Next.js UI, translations, theme, authentication, and server actions | Vercel                                                                        |
| `backend/`  | Drizzle schema, migrations, Neon connection, and development seed   | Neon Postgres for the database; migration and seed tools run locally or in CI |

This is an npm workspace. The `frontend` package explicitly depends on `@oba/backend` so server-side actions can share database code and types. Next.js server code executes on Vercel and connects to Neon Postgres. The browser never connects directly to the database. Treasurer data-entry actions run in Next.js server actions and write to Neon through the backend package.

## Requirements

- Node.js 24
- A Neon Postgres database for migrations and the development seed
- npm

## Local setup

1. Run `npm install`.
2. Copy `backend/.env.example` to `backend/.env.local` and replace `DATABASE_URL` with the Neon **pooled** connection string. The URL is read only by backend tools. Never commit `.env.local`.
3. Copy `frontend/.env.example` to `frontend/.env.local`. Set the same `DATABASE_URL`, a unique `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), and `BETTER_AUTH_URL=http://localhost:3000`.
4. Run `npm run db:migrate` to apply the checked-in Drizzle migrations.
5. For a **development database only**, run `npm run db:seed`. It inserts 20 fictional members and sample finance records. It refuses to run in production or when members already exist.
6. Run `npm run dev` and open `http://localhost:3000`. The root URL redirects to `/fr` or `/en` according to the browser language or a saved language choice.

The locale URLs are shareable. The theme follows the device setting until the visitor chooses Light, Dark, or System. The choice persists in local storage. A manual language choice persists in the `NEXT_LOCALE` cookie.

## Treasurer account

Set `ADMIN_EMAIL` and a password of 12–128 characters in `frontend/.env.local`, then run `npm run auth:setup`. The setup command creates the single `treasurer` account and refuses to overwrite an existing account. Remove `ADMIN_PASSWORD` after setup. Public sign-up is disabled, and a database constraint prevents any second user account.

Open `/fr/login` or `/en/login`. After signing in, `/admin/security` lets the treasurer enable an authenticator app and save backup codes. Login attempts are limited in the database. Admin routes validate the session in the proxy and layout; the shared `requireAdmin()` guard must also be called inside every future financial write action.

## Checks

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run check:messages`, and `npm run format:check`. `npm run db:generate` generates a new migration after schema edits; review the generated SQL before running `npm run db:migrate`.

The rollback-only SQL integration checks are documented in `backend/tests/README.md`. They cover finance totals, outstanding amounts, member statuses, voided payments, and the single-admin constraint.

## Deployment

Create a Neon project and a Vercel project for this repository. Set the Vercel project's **Root Directory** to `frontend`. Keep the root `package-lock.json` and both workspace folders in the repository. In Vercel's Root Directory settings, enable **Include source files outside of the Root Directory in the Build Step** so `frontend` can import `@oba/backend`. Apply migrations from a trusted development or CI environment before deploying. The seed script is development-only and must not run on production data. The database role used by the app should have only the needed permissions; migration credentials can use a separate, more privileged role.

Use Node.js 24 for Vercel. Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` in the Vercel project environment. `BETTER_AUTH_URL` must be the HTTPS origin of the deployment. Do not expose secrets through `NEXT_PUBLIC_` variables. Run the one-time account setup from a trusted local environment, not from the public website.

Use Neon's backup/restore options and save regular CSV reports from the summary page. Test restoration on a separate Neon branch before relying on backups.

## Phase status

The foundation, public module screens, SQL reporting views, CSV/print summary, clickable collected/spent totals with paginated payment and expense ledgers, protected admin shell, and treasurer record workflows are implemented. Open `/fr/admin/records` or `/en/admin/records` after signing in to add, edit, and remove members, dues, fines, payments, expenses, categories, fine reasons, and Sunday duties. Financial records are voided with a reason rather than physically deleted. Members with transaction or rota history can be deactivated but cannot be physically deleted. Payment status is calculated from charge due dates and allocations; correcting a payment reallocates it to the oldest open charges. Payment allocation applies cash to the oldest outstanding charges first; excess remains unallocated. The rota generator skips existing Sunday duties and balances assignments among active members. Incorrect financial entries can be voided with a reason and audit record. Expenses can store an optional HTTPS receipt link. File uploads, automatic fines for missed duties, and the PWA remain future work. All migrations and SQL integration checks passed on a fresh local PostgreSQL 18 database before these server actions were added. With no `DATABASE_URL`, the public pages and CSV export use clearly labeled fictional demo data. Without a database, `/fr/admin` and `/en/admin` open a treasurer demo with fictional records. The fines page supports browser-local add, edit, and delete for demo fines; those changes do not update the other demo modules or persist to Postgres. The treasurer account and write forms still require a configured Postgres database. A Neon connection is not configured in this workspace, so live database writes and authenticated UI flows remain unverified.
