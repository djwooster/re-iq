# Handoff

State as of 2026-11-04. Everything runs on mock data; `npm run dev`, `npm run build`,
`npm run lint`, and `tsc --noEmit` all pass.

## Where we are
- **Wireframe** (`/wireframe`, linked from the marketing nav): our current thinking about the
  monthly flow (Close → Exceptions → Owner report). Still exploring; next step is reviewing it with
  Brian. See `WIREFRAME.md`.
- **Demo app** (`/app`): the earlier month-end flow in `FLOW.md`. Not changed to match the wireframe.
- **Marketing site** (`/`): live, with the waitlist writing to Supabase. See `app/(marketing)/README.md`.
- **Usability testing** runs on the `testing` branch's Vercel preview: `/demo?fresh=1` opens signup
  into an empty workspace (README, "Usability testing").
- Ingestion is upload-only; PMS connectors are commented out, not deleted (cost).

## Built (demo app)
- **Overview** (`/app`): AI summary with evidence and sources, data-health note, role-specific
  metrics, Needs attention and Opportunities, insight drawer, and a close strip.
- **Month-end**: Close (`/app/close`), Questions (`/app/questions`), Actions with measured
  outcomes, Owner report (`/app/report`).
- **Performance**: period selector, variance by driver and property, trends, income statement.
- **Properties**: table and drawer; property detail tabs (Overview, Renewals & rents, Vendors,
  Work orders, Sources).
- **Data Sources**: mock upload flow (detection → mapping review → confirm) and import history.
- **Settings**: theme, organization name, team and invite modal.
- **Auth**: `/login`, `/signup` set a cookie; `proxy.ts` gates `/app`.
- **Dev tools**: role switcher and reset demo data, behind `NEXT_PUBLIC_SHOW_DEV_TOOLS=true`.

## Stubbed / not built
- On `main`, signup enters the demo org; the empty new-org experience lives on `testing`.
- Upload "parsing" reads only the file name (`lib/data/mock/detect.ts`).
- Logo upload, invite email, and email for reminders and questions: placeholders or clipboard only.
- No tests. The agent doesn't do visual QA; DJ does.
- Everything in `TODO.md`.

## Decisions that shape the code
- **Fixed demo clock**: `lib/dates.ts` for `/app` (Oct 18, 2026); the wireframe has its own
  (`components/wireframe-v2/seed.ts`, Dec 14, 2026).
- **Data layer**: UI reads only `lib/data/index.ts` (async, org-scoped). Mock data regenerates
  deterministically; user changes persist in localStorage (`lib/data/store.ts`).
- **Insights are computed** from the same ledger as tables, so numbers agree everywhere.
- **Variance = NOI impact**, positive is favorable; drivers sum exactly to NOI variance.
- **Missing months**: when a property lacks a month, its budget is excluded for that month too.
- **Own theme provider** instead of next-themes (React 19 warns on its script tag).
- **Toolchain pins**: ESLint 9 and TypeScript 6 until eslint-config-next supports newer.
- **Cache Components is on**: pathname hooks sit behind `<Suspense>`; dynamic routes use
  `generateStaticParams`; `generateMetadata` that awaits data breaks prerender.
- **Gotcha**: a running `npm run dev` doesn't pick up `app/globals.css` changes; restart it.
