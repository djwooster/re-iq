# RE-IQ — project notes

Multi-tenant AI asset-management dashboard for multifamily owners and asset managers.
Phase 1: read-only intelligence layer on mock data. No real parsing, integrations,
write-back, or AI calls. See `README.md`, `TODO.md`, `docs/product.md`.

@AGENTS.md

## Working agreement
- The user does all visual testing. Do not open the browser, take screenshots, or QA pages.
  Verify with `npx tsc --noEmit`, `npm run lint`, `npm run build`, and that `npm run dev`
  starts and routes return 200 (curl with cookie `reiq_session=demo` is fine).
- Finish the work, then stop and report what's built and what isn't. Refine together after.
- Treat screens as hypotheses: small components, data access in one place, no logic in pages.
- Every feature should answer a core question (budget tracking, where money is lost, what
  needs attention, where NOI can grow, what to do this week). Leave out what doesn't.
- No lorem ipsum or placeholder copy. Plain, specific language; no hype.
- Commit at logical milestones on `main` (remote: github.com/djwooster/re-iq). Push only when asked.

## Building to be acquirable (see `STRATEGY.md`)
- One codebase for every customer: no customer-specific branches, forks, or hard-coded org IDs.
  Differences between customers go through plan entitlements or org settings.
- Pricing, plans, and limits live in one config (future `lib/billing/plans.ts`), never in UI copy
  or scattered conditionals. Gate paid features through entitlements, not ad-hoc checks.
- When adding a feature, say whether it's core or an expansion path (units, seats by role, module).
- Onboarding must be self-serve. Anything that needs our staff to set up a customer is a services
  cost; prefer fixing it in the product (parsing templates, mapping review) for everyone.
- Keep it auditable: every record has `org_id`; changes to customer data get an audit trail once
  there's a real backend.

## Architecture
- Next.js 16 App Router (Cache Components on), React 19, Tailwind v4, Motion, Recharts.
- Two separate flows. `/app` (`app/(workspace)`) is the real product for signed-in users: real records
  through `lib/workspace` (pages load with `requestWorkspace()`), no sample data, empty states until
  there's data, setup remembered on the org. `/prototype` is the standalone hard-coded prototype
  (browser storage, no sign-in); never mix the two. `app/_parked-demo` is the old mock demo, unrouted.
- `proxy.ts` (not middleware) gates `/app` on a Supabase session (`lib/supabase`, `lib/auth`); `/demo` is parked.
- Mock data (`@/lib/data`, `lib/data/mock/*`) only feeds the parked demo and must never reach `/app`.
- `lib/types` mirrors future Supabase tables; every record has `org_id`.
- Mock data is deterministic (`lib/data/mock/*`); user changes persist in localStorage via
  `lib/data/store.ts`. Components load data with `useData(fn, deps)` from `lib/hooks/use-data`.
- Insights and AI summaries are computed in `lib/data/insights.ts` from the same ledger as
  tables; keep it that way so numbers agree across views.
- Demo clock is fixed: `TODAY` / `LATEST_MONTH` in `lib/dates.ts`. Don't use `new Date()` in render.
- Client components using `usePathname`/`useSearchParams` must sit under `<Suspense>`,
  or prerender fails.

## Domain conventions
- Variance is favorable/unfavorable, expressed as NOI impact (positive = favorable).
  Color follows favorability. Drivers must sum to the NOI variance.
- Currency abbreviated in summaries ($8.42M, -$290K), full in tables. Percents one decimal.
- Always distinguish physical vs. economic occupancy.
- AI statements: show evidence and source one click away, label estimates, show data freshness.
- Resident data is lease-level only; never store names or personal details.

## Design system
- Tokens are CSS variables in `app/globals.css` (`--bg`, `--surface`, `--border`,
  `--text-*`, `--favorable`, `--unfavorable`, `--warning`, `--data`) mapped to Tailwind
  (`bg-surface`, `text-fg-2`, `text-favorable`, ...). Never hard-code colors.
- Light is the default theme. Neutral UI; green/red/amber only for state; the one accent (`--data`, steel
  teal in dark) only for data viz and RE-IQ's AI moments. Brand blue (`--brand`) only for the selected nav item. No glows, gradients, or decorative color.
  Hierarchy via opacity and scale.
- Properties are marked in blue (`--property`, Shepherd Fairey poster blue) across the app: icons, eyebrows,
  labels that name a property. DJ's call, 2026-11-11; apply it as screens are touched, not in one sweep.
- Geist Sans everywhere, no monospace (DJ's call, 2026-11-11). `num` gives tabular numbers for
  metrics and table columns; `eyebrow` is small uppercase labels. 11–12px body, 13–14px headings.
- Cards: surface, 1px border, rounded-lg, no shadow. Only modals/drawers get shadows.
- Motion: fade + 8px rise, 0.3s ease-out, 0.05s stagger. No springs or bounce.
- Primitives live in `components/ui`; reuse them before adding new ones.
- Charts: one axis, faint horizontal grid, custom legend, inverted tooltip, 2px lines.

## Toolchain
- ESLint pinned to 9 and TypeScript to 6 (eslint-config-next doesn't support 10/7 yet).
- Dev tools (role switcher, reset demo data): `NEXT_PUBLIC_SHOW_DEV_TOOLS=true` in `.env.local`.
