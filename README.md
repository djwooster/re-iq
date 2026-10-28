# RE-IQ

AI asset-management dashboard for multifamily owners and asset managers. Phase 1 is a
read-only intelligence layer running entirely on realistic mock data: no real parsing,
integrations, write-back, or AI calls.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Sign in with any credentials (the form is prefilled), or open `/demo` to skip the form. You land in the Alder Peak Capital
sample portfolio: 14 properties, 3,790 units, 6 markets, 4 property managers, 24 months
of history through Sep 30, 2026. The demo clock is fixed at Oct 18, 2026 (`lib/dates.ts`).

Other scripts: `npm run build`, `npm run lint`.

## Usability testing

Sessions run on the `testing` branch, which Vercel deploys to its own preview URL, so
changes there never touch production (`main`). Merge what tests well back into `main`.

Start each participant at `/demo?fresh=1`: it signs out, clears everything earlier
participants did in that browser, and opens signup. Signing up creates an empty workspace
named for the company entered; Overview, Performance, Properties, and Actions show empty
states until the first T12 is confirmed, and each property joins the portfolio with its
first T12. (`/login` and plain `/demo` still enter the Alder Peak sample portfolio.)

Participants can click **Use example reports** in the upload area (new workspaces only) to
load the same files without handling any, or upload `/test-files/re-iq-test-files.zip` (download it from the
preview URL and hand it over before the session). The mock parser reads file names, so it
recognizes these: seven T12s (Gulch Terrace's is a month behind), a Brookstone rent roll,
and a Hickory budget whose fiscal year has to be picked by hand. Regenerate them with
`npx tsx scripts/make-test-files.ts`.

Known shortcuts in the empty workspace: a T12 brings its property's budget and rent roll
with it, so budget variance shows before a budget is uploaded; connectors stay
"not available in this preview"; files with unrecognized names can be filed under any of
the 14 sample properties.

## Dev tools

Set `NEXT_PUBLIC_SHOW_DEV_TOOLS=true` in `.env.local` (see `.env.example`) and restart the
dev server. The sidebar footer then shows an internal panel with:

- **Role preview**: Asset Manager (default), Owner / Investor, Executive. Changes the
  Overview's summary, headline metrics, and secondary panels.
- **Reset demo data**: clears everything changed in this browser (uploads, confirmed
  mappings, action status, invites).

## Where the data lives

- `lib/data/index.ts` is the data access layer. UI code imports only from here. Every
  function is async and org-scoped (`getPortfolioSummary(orgId, period)`,
  `getProperty(id)`, `uploadReport(file)`, ...), so the internals can move to Supabase and
  a real parsing pipeline without UI changes.
- `lib/types` mirrors the future Supabase tables; every record carries `org_id`.
- `lib/data/mock/catalog.ts`: organization, team, property managers, properties, vendors,
  data sources. Story knobs (`story: "hvac"`, etc.) live on each property seed.
- `lib/data/mock/generate.ts`: deterministic generator for monthly budget and actual GL
  lines, month-end occupancy and delinquency, rent roll and leases, and work orders.
- `lib/data/mock/imports.ts`: seeded import history and per-PMS chart-of-accounts
  templates used for mapping. `mock/detect.ts` is the mock "parser" (reads file names).
- `lib/data/insights.ts`: issues, opportunities, and AI summaries, computed from the same
  records the tables use, so every number agrees across views.
- `lib/data/store.ts`: demo persistence. Only user changes are stored, in
  `localStorage`; the seeded portfolio is regenerated on each load.

Freshness is derived, not stored: an upload-fed property's "data through" date is its
latest processed T12. Confirming an upload or a review moves it forward everywhere.

## Seeded stories

- Lakeline Flats (Frisco): vacancy and concessions drive most of the portfolio's gap.
- Mesa Verde (Mesa): R&M over budget from repeat HVAC calls to the same units.
- Brookstone Park (Charlotte): many below-market leases with renewals coming up.
- Crestline properties: landscaping spend above benchmark.
- Magnolia Court: delinquency rising; September T12 in **Needs review** (2 mappings).
- Hickory Station: September T12 upload **Failed** (scanned PDF).
- Peachtree Landing utilities and Willow Bend contract labor as smaller issues.

To try the upload flow, drop a file named like
`Hickory Station - 12 Month Income Statement - Sep 2026.xlsx`. Detection reads the
property, report type, and period from the name; anything it can't tell, you choose.

## Structure

- `app/(app)/app/*`: the product. `app/(auth)`: login and signup. `app/(marketing)`:
  the public landing page and waitlist (see its README).
- `proxy.ts`: mock auth gate (a session cookie).
- `components/ui`: primitives (buttons, tables, drawers, toasts, metrics).
- Design tokens are CSS variables in `app/globals.css`, exposed to Tailwind v4 via
  `@theme`. Theme is applied before first paint by an inline script
  (`components/theme`).

See `TODO.md` for what comes next.
