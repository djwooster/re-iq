# Wireframe

The wireframe at `/wireframe` (on the marketing nav) is our current thinking about how RE-IQ should
work. It's still being explored: the `/app` demo reflects the earlier flow in `FLOW.md` and hasn't
been changed to match. Next step: review it with Brian, whose doc *Multifamily Asset Manager
Dashboard — Reports & Decision Workflow* (local only, not in git) it's built from.

It reads like a real app, not a presentation: generic names (Property A–L, Manager 1–4, Owner firm),
gray bars instead of numbers, but real statuses, thresholds, and dates. Clicks carry across screens
and reset on reload. Demo clock: Dec 14, 2026, the November close, packages due Dec 12.

Code: routes in `app/wireframe`, components and data in `components/wireframe-v2`
(`seed.ts` data, `store.tsx` state and actions, `derive.ts` statuses). The low-fidelity v1 is
parked in `app/_wireframe-v1` (not routed).

## The month

The asset manager (AM) does three things each month:

1. **Close**: get every property manager's (PM's) package in and checked. The package is P&L, T-12,
   rent roll, box score, AR aging, capex, renovation tracker, and GL. Close shows who's in, partial,
   or late, which lines need mapping to the owner's chart of accounts, and reconciliation checks.
2. **Exceptions**: work each metric that crossed a threshold (delinquency over 3%, loss to lease
   over 5%, DSCR near covenant, and so on) until it's closed.
3. **Owner report**: send it once every property is ready. Each property shows what's blocking it.

The Overview shows those three as status panels, then KPIs and the property table.

## Exceptions

Stages: **New → Diagnosing → Waiting on PM → Action assigned → Closed**.

- Diagnose: drill from the metric to the cause (property → line → units), mark it one-time or ongoing.
- Waiting on PM is a status, not a messaging tool. The AM and PM talk offline; RE-IQ records that
  the AM is waiting, when an answer is expected, and the answer when it comes. Past the date with no
  answer, it's Overdue.
- Act: the AM writes the action, owner, due date, and why. Brian's typical response for that trigger
  is offered as a suggestion, never pre-selected. A capital-project action starts a renovation.
- Every decision lands in the Decision log.

## Other screens

- **Managers**: one page per PM: what's waiting on them, package history, their properties, tasks,
  approvals, and their upload link.
- **Properties**: On plan or Off plan (off plan = any open exception), a scorecard per property,
  and a stacking plan down to the unit.
- **Renovations**: six steps (find, scope and underwrite, bid and award, pilot, scale, measure and
  decide). Only the two gates need the AM: Gate A (approve and fund) and Gate B (scale after the pilot).
- **Tasks**: gates and PM approvals waiting on the AM.
- Financials, leasing, operations, and capital pages are thin stubs.

## Principles

- No recommendations. The product shows facts, status, and evidence; the AM decides.
- Status is derived wherever possible rather than marked by hand.
- Nothing aimed at us or Brian inside the product: no tours, explainers, or internal notes.
