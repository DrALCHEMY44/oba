# Decisions

## Phase 1

- French is the fallback language when the browser's `Accept-Language` header matches neither French nor English. Locale-prefixed URLs take precedence, and a language-switch choice is saved for later visits.
- Store FCFA amounts in integer columns. PostgreSQL `integer` is sufficient for individual association transactions; aggregate queries in later phases will cast to `bigint` where needed.
- Use UUID primary keys for records. Payment receipts have a separate PostgreSQL `bigint` identity sequence. Numbers are unique and increasing, but rollback can create gaps; the app will not promise gapless numbering.
- Use `category_id` as a foreign key instead of free-text `category`, so English and French labels are stored once in `expense_categories`.
- Add `issued_on` to charges because every fine requires a date. Add `voided_by` to each financial table for traceability. Add a singleton `app_settings` table for the optional missed-duty fine rule.
- Keep `issued_by` and `audit_log.actor_id` as text until the authentication choice and managed auth schema are confirmed in Phase 2. The sample seed uses `development-seed` as its actor marker.
- The seed uses fictional names and no contact details. It is for development only.
- Use Neon's serverless WebSocket pool with Drizzle so later financial writes can use database transactions. Keep the pool small for serverless deployments.
- Initialize shadcn/ui with its official Radix preset. The CLI added `radix-ui`, `cn`, `tw-animate-css`, and `shadcn` for the component system; these are supporting packages for the required UI stack.
- Defer receipt upload storage to its assigned phase.

## Workspace split

- Separate the Next.js app into `frontend/` and database code into `backend/`, with npm workspaces and a single root lockfile. Vercel deploys the `frontend` workspace; Neon stores the data.
- Keep the backend package importable by server-side Next.js code. The user chose Vercel server actions for API writes, with Neon hosting Postgres. The frontend has a `server-only` database import boundary to guard against client imports.

## Authentication and module UI

- Checked the current official Neon managed-auth integration and its npm dependency tree. The available SDK pinned Better Auth 1.7.6, which npm audit flagged for a critical advisory. Use direct Better Auth 1.7.19 with Drizzle, as permitted by the brief. The managed Neon service itself was not assessed by that dependency scan.
- Public sign-up is disabled. The sole auth user has the fixed ID `treasurer`, enforced by a database check; the setup script hashes a password supplied through environment variables. No credentials are committed.
- Store auth timestamps with time zones. The Better Auth CLI generated the initial schema; the singleton user constraint and time-zone types are intentional adaptations.
- Persist rate-limit state in Postgres so limits survive serverless instances. Support TOTP and recovery codes through Better Auth's two-factor plugin.
- Keep all public queries explicit about selected fields; phone numbers and contact details are never part of the public data module.
- Finance totals use SQL views, with voided records excluded. Dues/fine collected subtotals count allocations; unallocated cash stays in total collected and the balance.
- Applied Anthropic's official `frontend-design` skill for the UI. Use a navy/court-blue/basketball-orange palette, a locally served Archivo variable font, persistent desktop navigation, and all six public module links on mobile. `@fontsource-variable/archivo` is a supporting font asset dependency. See `DESIGN.md`.
- Target Node.js 24, matching the checked local runtime and Vercel's supported runtime. Recharts is used for the requested finance charts.

## Future ideas

None proposed.
