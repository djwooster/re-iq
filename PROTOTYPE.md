# Prototype

`/prototype` is the wireframe's flow (see `WIREFRAME.md`) built to look and work like the product:
the app design system, real numbers, charts, and self-serve onboarding. `/wireframe` is unchanged
and stays as the low-fidelity reference.

Generic names (Property A–L, Manager 1–4) until the user renames them in setup. Demo clock:
Dec 14, 2026, the November close.

## Flow

1. `/prototype`: create a workspace (name, work email, firm, password), or sign in. A new
   workspace has no data: every app page sends you to setup until it's finished, and signing in
   before then resumes setup.
2. `/prototype/setup/properties`: one drop for every report, all properties at once. RE-IQ guesses
   each file's property and report type from its name (`guessProperty`, `detectKind` in `seed.ts`)
   and shows a checklist table: a row per property, a column per report. Click a row to rename the
   property and retype, move, remove, or add files; unmatched files get their own list. Starts
   blank; "Fill with sample reports" fills twelve properties and one unmatched scan.
3. `/prototype/setup/managers`: the management companies behind those properties, reports emails,
   upload links, optional email invite.
4. `/prototype/setup/review`: reading, mapping, reconciliation, and threshold checks, then the GL
   labels to confirm; "Open dashboard" lands on the Overview.

The dashboard always shows the twelve-property sample portfolio; setup only renames it.
Names entered in setup appear everywhere, including seeded logs, tasks, and approvals.
State persists in the browser (`localStorage`, key `reiq-prototype-v1`); the user menu's
"Start over" resets it.

## Code

`components/prototype`, routes in `app/prototype`.

- `numbers.ts`: one monthly operating model per property, Dec 2025–Nov 2026 (P&L lines, budget,
  prior year, underwriting, KPIs, debt, units). Self-contained so it can run under plain Node.
  Property K's November package is late, so K reports through October and is left out of
  November totals on both sides.
- `metrics.tsx`: formatting and the figures screens show (portfolio KPIs, NOI vs. comparison,
  scorecards). `evidence.ts`: each exception's drill path in numbers.
- `seed.ts`: the story (exceptions, tasks, approvals, projects, decisions). `store.tsx`: state,
  actions, persistence, and renaming. `derive.ts`: close status and readiness.
- `ui.tsx` and `chart.tsx`: prototype blocks on `components/ui` and the design tokens.

## Not real

From here on the prototype stays lightweight: a hi-fi wireframe with hard-coded content, not new state or data wiring.


- Parsing: dropped files are listed with a type guessed from the name; nothing reads their contents.
- Emails, reminders, exports, and copied links only show a toast.
- Mapping choices made in setup aren't remembered per label; only "approved" is.
- Several module tabs (GL detail, AP aging, funnel, work orders, inspections) use plausible
  fixed figures rather than the model.
