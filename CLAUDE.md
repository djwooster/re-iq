# RE-IQ

Multi-tenant asset-management app for multifamily owners. Property managers upload monthly
reports; RE-IQ reads them and shows owners what changed and what needs attention.

## Stack
Next.js 16 App Router (Cache Components), React 19, Tailwind v4, Motion, Recharts, Supabase
(Postgres, Auth, Storage), Anthropic API (report reading), Resend (email), Sentry (errors only),
Vercel. Next.js 16 differs from your training data: read `node_modules/next/dist/docs/` before
using an API.

- `/app` is the product. `/prototype` is frozen for feedback sessions: don't change it, and `/app`
  never imports from `components/prototype`.
- Data access lives in `lib/workspace`; pages load with `requestWorkspace()`. No logic in pages.

## UI
- Colors are tokens in `app/globals.css`; never hard-code colors. Neutral UI; green/red/amber only
  for state; `--data` only for charts and AI moments.
- Brand blue (`--brand`) only for interactive elements: primary buttons, text links, table row
  links, checkboxes, the selected nav item. Never for data, state or decoration.
- Use the shared pieces in `components/app/ui.tsx`. Tables of records people act on: rows open the
  record, a checkbox first (`useSelection`, `SelectTd`), a ⋯ `RowMenu` last, and `SelectionBar` for
  bulk actions. Destructive actions confirm in a modal. Empty states use `SpotEmpty`.
- Variance is favorable/unfavorable as NOI impact (positive = favorable); color follows favorability.

## How we ship
1. Build on localhost. Localhost uses the production Supabase project (no customer data yet).
2. Check with `npx tsc --noEmit` and `npm run lint`. Don't open the browser; DJ tests visually.
3. Commit on `main`. Push only when DJ says "ship it". Vercel deploys `main` to production.
4. Database changes go in this order: migration in `supabase/migrations` → apply on local
   Supabase (OrbStack) → apply on production → then ship the code that uses it.
5. Any production change (migration, Auth config, env vars, storage, deleting data): show the
   diff or command and wait for DJ's OK.

## Security rules
- Every table has `org_id` and row-level security on, with its policies, in the migration that
  creates it.
- Internal functions live in the `private` schema and are never callable by `anon` or
  `authenticated`.
- Uploaders (property managers) only reach `/upload`. They never reach `/app` or read
  dashboard data.
- Original uploads stay in the private reports bucket. Resident names and bank account numbers
  are stripped when a report is read: never in parsed data, read results or logs, and never sent
  to the Anthropic API.
- Secrets stay server-side, never `NEXT_PUBLIC_`. DJ adds secrets himself; never ask for them
  in chat.

## Tests
Before shipping a change that touches the database, sign-in or permissions, run the isolation
tests on local Supabase: `npx supabase start`, then `npm test`. Don't ship on a failure.
