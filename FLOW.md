# Prototype: the asset manager's month (testing branch)

A clickable prototype for interviews and for defining the MVP. All data is fake and
deterministic. Today is **Dec 15, 2026**; October is closed and November packages are
mostly in. RE-IQ states facts, status, and evidence. It never recommends what to do.

Start: `/demo?fresh=1` (empty workspace, first run) or "Load sample portfolio".
Tour: Settings → Demo tour.

| Stage | Screen | Demo state |
|---|---|---|
| 0. First T12 | Overview (empty) | Any file reads as `Brookstone_T12_Nov2026.xlsx` → mapping review → standardized T12 that ties to the ledger → Brookstone added → "Add your other properties" loads the sample |
| 1. Close status | Overview | November: 3 of 4 managers in · Crestline late · The Vale missing AR aging |
| 2. Packages arrive | Data Sources → Close tracker, `/upload/[token]` | Summit Dec 9, Harbor Dec 11, Northgate Dec 12 (no Vale AR), Crestline nothing |
| 3. Rebuild in Excel | Data Sources → Mapping review | Summit's Contract Labor and Crestline's Misc Turn Exp / Pkg Lockers need a look; four managers' repair labels land on one account; changes are remembered per manager |
| 4. Check the math | Data Sources → Reconciliation | 64 of 72 pass; breaks: Willow Bend payroll vs register ($42K contract labor), The Vale AR aging missing |
| 5. Skim variances | Overview, Performance, Properties | Seven issues ranked by $ (below); manager scorecards; property tabs |
| 6. Ask why | Issue page | Driver, trend with the issue's months shaded, evidence where every number opens its source line |
| 7. Decide, report up | Actions, Reports, owner view | Open → Acting → Resolved with Jordan's notes; three editable reports; owner sees health, results, shared reports |

## Planted issues (computed from the ledger)

| Issue | Vs budget | Status |
|---|---|---|
| Lakeline Flats: vacancy and concessions since Jan | −$695K | Open |
| Oakridge: economic occupancy 8.2 pts below physical | −$103K | Open |
| Crestline ×3: landscaping per unit 59% above the rest | −$76K | Open |
| Mesa Verde: R&M over budget May–Sep, 26 of 45 HVAC calls to 4 units | −$59K | Resolved: R&M back on budget, ~$39K/yr vs $31K capex |
| Willow Bend: payroll since April (contract labor) | −$42K | Acting |
| Magnolia Court: delinquency doubled since March | −$37K | Open |
| Peachtree Landing: utilities 27% over since June | −$34K | Open |

Lakeline is also below its 1.25x DSCR covenant (1.19x), which leads the lender report.

## Where the logic lives

- Story knobs: `lib/data/mock/catalog.ts` (properties, managers, loans, capex, renewal rates) and `lib/data/mock/generate.ts`.
- Issues and lineage: `lib/data/issues.ts`, `lib/data/lineage.ts` (T12 lines in each manager's chart of accounts, source descriptions).
- Close, mapping review, reconciliation, upload links: `lib/data/review.ts`, `lib/data/close.ts`.
- Scorecards and loans: `lib/data/performance.ts`. Property tabs: `lib/data/property-detail.ts`.
- Reports, growth, owner view settings: `lib/data/reports.ts`. First run: `lib/data/first-run.ts`.

## Simplified or stubbed

- Files dropped on a manager's upload page show as received there but don't reach the tracker.
- "Budget vs actual" isn't a separate monthly report; the close tracks T12, rent roll, AR aging, work orders.
- Alert thresholds display but don't change anything. PDF/Excel export shows a toast.
- Report edits, status changes, mappings, and owner settings persist in this browser only.
- The Questions-to-PM flow is unlinked (`components/questions`, `lib/data/questions.ts`), not deleted.
- `scripts/make-test-files.ts` still uses the old property ids.
