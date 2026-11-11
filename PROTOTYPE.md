# Prototype

`/prototype` is the wireframe's flow (see `WIREFRAME.md`) built to look and work like the product:
the app design system, real numbers, charts, and self-serve onboarding. `/wireframe` is unchanged
and stays as the low-fidelity reference.

Generic names (Property A–L, Manager 1–4) until the user renames them in setup. Demo clock:
Dec 14, 2026, the November close.

## Flow

1. `/prototype`: sign in (goes to the Overview), or "Set up your portfolio".
2. `/prototype/setup/portfolio`: firm name; import a property list (simulated); rename properties.
3. `/prototype/setup/managers`: management companies found in the list, reports emails, upload links,
   optional email invite.
4. `/prototype/setup/upload`: drop November packages (simulated): files by manager, a missing report,
   one manager not in yet, then reading, mapping, reconciliation, and threshold checks.
5. `/prototype/setup/mapping`: confirm the three GL labels nobody can guess; land on the Overview.

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

- Parsing: dropping files (or "Use the sample files") always runs the sample packages.
- Emails, reminders, exports, and copied links only show a toast.
- Mapping choices made in setup aren't remembered per label; only "approved" is.
- Several module tabs (GL detail, AP aging, funnel, work orders, inspections) use plausible
  fixed figures rather than the model.
