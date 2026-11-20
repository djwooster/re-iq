# Product

How RE-IQ is meant to work, and what each of the three versions on the site shows.

| Route | What it is | Status |
|---|---|---|
| `/prototype` | The current flow at high fidelity: onboarding, Close, Exceptions, Owner report, on the app design system with real numbers | **Current thinking.** Hard-coded hi-fi wireframe; no new state or data wiring unless asked |
| `/wireframe` | The same flow in low fidelity (gray bars, generic names) | Reference; unchanged |
| `/app` | The real, signed-in app: the prototype's layout on real records (properties, reports, managers, close), empty states elsewhere | **Live** for invited users |

Brian's doc *Multifamily Asset Manager Dashboard — Reports & Decision Workflow* (local only, not in
git) is the source for the wireframe and prototype.

## The month

The asset manager (AM) does three things each month:

1. **Close**: get every property manager's (PM's) package in and checked: P&L, T-12, rent roll, box
   score, AR aging, capex, renovation tracker, GL. Close shows who's in, partial or late, which lines
   need mapping to the owner's chart of accounts, and reconciliation checks.
2. **Exceptions**: work each metric that crossed a threshold (delinquency over 3%, loss to lease over
   5%, DSCR near covenant, ...) until it's closed. Stages: **New → Diagnosing → Waiting on PM →
   Action assigned → Closed**.
   - Diagnose: drill from the metric to the cause (property → line → units); one-time or ongoing.
   - Waiting on PM is a status, not a messaging tool. RE-IQ records that the AM is waiting, when an
     answer is due, and the answer. Past the date, it's Overdue.
   - Act: the AM writes the action, owner, due date and why. A capital-project action starts a
     renovation. Every decision lands in the Decision log.
3. **Owner report**: sent once every property is ready; each property shows what's blocking it.

Other screens: **Managers** (one page per PM: what's waiting on them, package history, upload link),
**Properties** (On plan / Off plan, scorecards, stacking plan), **Renovations** (six steps; only
Gate A, approve and fund, and Gate B, scale after the pilot, need the AM), **Tasks**.

## Principles

- No recommendations. The product shows facts, status and evidence; the AM decides.
- Status is derived wherever possible, not marked by hand.
- Nothing aimed at us or Brian inside the product: no tours, explainers or internal notes.
- Ingestion is upload-only. PMS API connectors are on hold for cost (commented out, not deleted).
  Automation later is an email-in address per org that PM systems send scheduled reports to.

## Core vs. expansion

- Core: Close, Exceptions, actions and outcomes. They're the monthly job; without them there's no habit.
- Expansion: the owner report is the investor-reporting module (what investor seats read); email-in
  ingestion is the automation module.

## `/prototype`

Demo clock Dec 14, 2026 (the November close, packages due Dec 12). Generic names (Property A–L,
Manager 1–4) until the user renames them in setup; names entered there appear everywhere.

1. `/prototype`: create a workspace or sign in. A new workspace has no data: every page sends you to
   setup until it's done.
2. `/prototype/setup/properties`: one drop for every report. File names are matched to a property and
   report type (`guessProperty`, `detectKind` in `seed.ts`); "Fill with sample reports" fills twelve
   properties and one unmatched scan.
3. `/prototype/setup/managers`: management companies, report emails, upload links, optional invite.
4. `/prototype/setup/review`: reading, mapping, reconciliation and threshold checks; then the Overview.

State is in `localStorage` (`reiq-prototype-v1`); the user menu's "Start over" resets it.

Code in `components/prototype`, routes in `app/prototype`:
- `numbers.ts`: one monthly operating model per property, Dec 2025–Nov 2026 (P&L, budget, prior
  year, underwriting, KPIs, debt, units). Property K's November package is late, so it's left out of
  November totals on both sides.
- `metrics.tsx`: the figures screens show. `evidence.ts`: each exception's drill path.
- `seed.ts`: the story. `store.tsx`: state, persistence, renaming. `derive.ts`: close status.
- `ui.tsx`, `chart.tsx`: prototype blocks on `components/ui` and the design tokens.

Not real: file contents aren't read; emails, reminders, exports and copied links only show a toast;
some module tabs (GL detail, AP aging, funnel, work orders, inspections) use fixed figures.

## `/wireframe`

Routes in `app/wireframe`; components and data in `components/wireframe-v2` (`seed.ts`, `store.tsx`,
`derive.ts`). Clicks carry across screens and reset on reload. v1 is parked in `app/_wireframe-v1`.

## Earlier demo (parked in `app/_parked-demo`, not routed)

Jordan Reyes, AM at Alder Peak Capital, on Oct 18, 2026, partway through the September close: 14
properties, 3,790 units, 4 property managers, 24 months of history.

| Stage | Screen | Demo state |
|---|---|---|
| Reports in | Close (`/app/close`) | 11 of 14 ready; Hickory's T12 is an unreadable PDF; Magnolia's needs 2 mappings |
| Read the month | Overview, Performance | September NOI $142K below budget |
| Investigate | Insight drawer → property → evidence | Lakeline vacancy, Mesa Verde HVAC, Peachtree utilities, Willow Bend labor |
| Ask managers | Questions (`/app/questions`) | 9 lines over $3K and 10% worse than budget |
| Decide | Actions | 5 new, 2 in progress |
| Report | Owner report (`/app/report`) | Draft with accepted explanations |
| Did it work? | Actions (Done) | Camelback irrigation (~$10K), Gulch Terrace concessions (~$55K) |

Logic: `lib/data/close.ts` (required reports, due date), `questions.ts` (variance threshold),
`actions.ts` (outcomes vs. the prior three months), `report.ts`. Thresholds are constants today and
become org settings.

To try its upload flow, drop a file named like
`Hickory Station - 12 Month Income Statement - Sep 2026.xlsx`; detection reads only the name.
