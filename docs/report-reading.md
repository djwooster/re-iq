# Report reading: plan for a dedicated session

Turns uploaded reports into numbers. It feeds setup's Review step, Pulse, the Overview KPIs, Close checks,
Exceptions and every data page in `/app`. The prototype (`/prototype/setup/review`, `components/prototype/setup.tsx`
`Review`, and the data pages) is the spec for what the user sees; this plan is the machinery underneath.

## Inputs needed from DJ before starting

- Real exports, names stripped, from the PMSs pilot users run (Yardi first, then Entrata/RealPage/AppFolio):
  T-12, monthly P&L, budget, AR aging, box score / unit availability, rent roll, work orders, make-ready,
  leasing activity (traffic), renewals. Two or three managers' versions of the same report if possible.
- The owner chart of accounts to map into (the prototype's `CHART_OF_ACCOUNTS` is the starting list).
- Threshold defaults per KPI (the prototype's `KPIS` targets in `components/prototype/seed.ts`).

## Stages

1. **Extract** (server, after `finalizeUpload`): read `.xlsx/.xls/.csv` from the private `reports` bucket with
   SheetJS. Find the header row, the period columns, the account label column and the total rows. Output rows of
   `{ label, period, amount }` (financials) or typed rows (AR aging buckets, unit statuses, work orders, funnel
   counts). PDFs and scans later (text PDFs via a PDF text extractor; scans need OCR or an AI provider, see below).
2. **Detect**: confirm the report type and period from contents, not only the user's choice; flag mismatches.
3. **Map**: match each manager label to an owner account. Exact and normalized matches first, then a per-manager
   memory of confirmed mappings, then similarity with a confidence score. Below a threshold → "needs review".
   Confirmations are stored per org + manager and reused next month (prototype: "GL labels to confirm").
4. **Reconcile**: checks that the numbers agree: T-12 month equals the P&L month, sections sum to totals, NOI =
   EGI − expenses, rent roll units = box score units, AR aging total = balance sheet receivable. Each check
   passes, fails (with both sides shown) or can't run (missing report).
5. **Metrics and thresholds**: compute the KPIs (`KPIS`: NOI, EGI, physical/economic occupancy, leased %,
   loss to lease, collections, bad debt, delinquency 30/60/90, open and aged work orders, non-ready units,
   funnel and conversion, renewals, DSCR…) per property and period, compare to org thresholds, and open
   exceptions with their evidence (the prototype's drill path: metric → property → line → units).

## Data model (migrations, all with `org_id` and RLS like `uploads`)

- `report_runs`: one per upload: status (queued, read, needs_review, failed), detected type/period, error.
- `report_lines`: extracted rows (upload, label, account, period, amount) for financial reports.
- `report_facts`: typed values for operational reports (metric, period/as_of, value, dimension e.g. bucket).
- `account_mappings`: org + manager company + label → owner account, confirmed_by, confirmed_at.
- `reconciliation_checks`: run, check, status, left/right values.
- `metric_values`: org, property, metric, period or as_of date, value, source upload ids (evidence).
- `org_thresholds` (if not already added for Settings): org, property (null = all), KPI, target.
- Uploads keep `status`; extend its check to `received | reading | read | needs_review | failed`.

## Where it runs

- Start synchronous inside `finalizeUpload` for small files (<2 MB, well under Vercel's time limit), then move to a
  queue (Supabase Queues / pg_cron calling a route, or Vercel Queues) once files or volume grow.
- Never log file contents or amounts (see `lib/logger.ts`). Strip resident names and bank account numbers at
  extraction; keep payroll as totals only (SECURITY.md backlog).

## AI (optional, later)

Only for label mapping suggestions and scanned PDFs. Provider-agnostic `lib/ai` (security plan item), a provider
that doesn't train on customer data under a DPA, added to the subprocessor list on /privacy and /security, and
every AI-derived value labeled as an estimate with its evidence one click away (CLAUDE.md).

## Tests

Fixture exports (de-identified) per PMS and report type in `tests/fixtures/reports/`; golden outputs for extract,
map and reconcile; a cross-org test that one org's mappings and metrics are never readable by another.

## Order

1. Extract + detect for T-12 / P&L (Excel/CSV) and AR aging → Review step shows real reading.
2. Mapping with per-manager memory → "GL labels to confirm".
3. Reconciliation checks → Close and Review.
4. Box score, rent roll, work orders, make-ready, leasing activity, renewals → Pulse fills in.
5. Thresholds → Exceptions; KPIs → Overview cards, NOI chart, property table.
