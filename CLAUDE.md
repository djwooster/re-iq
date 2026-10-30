# RE-IQ — project notes

Multi-tenant AI asset-management dashboard for multifamily owners and asset managers.
Phase 1: read-only intelligence layer on mock data. No real parsing, integrations,
write-back, or AI calls. See `README.md`, `HANDOFF.md`, `TODO.md`.

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
- Routes: `app/(app)/app/*` product, `app/(auth)` login/signup, `app/(marketing)` reserved.
  `proxy.ts` (not middleware) gates `/app` on a mock session cookie.
- UI imports data only from `@/lib/data` (async, org-scoped). Never import `lib/data/mock/*`
  or `lib/data/core.ts` from components or pages.
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
- Neutral UI; green/red/amber only for state; cyan only for data viz. Hierarchy via opacity and scale.
- Geist Sans for UI; Geist Mono with tabular numbers (`num`, `eyebrow` utilities) for metrics,
  table numbers, file names, eyebrow labels. 11–12px body, 13–14px headings.
- Cards: surface, 1px border, rounded-lg, no shadow. Only modals/drawers get shadows.
- Motion: fade + 8px rise, 0.3s ease-out, 0.05s stagger. No springs or bounce.
- Primitives live in `components/ui`; reuse them before adding new ones.
- Charts: one axis, faint horizontal grid, custom legend, inverted tooltip, 2px lines.

## Toolchain
- ESLint pinned to 9 and TypeScript to 6 (eslint-config-next doesn't support 10/7 yet).
- Dev tools (role switcher, reset demo data): `NEXT_PUBLIC_SHOW_DEV_TOOLS=true` in `.env.local`.
