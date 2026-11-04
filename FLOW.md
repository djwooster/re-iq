# The asset manager's month

This describes the `/app` demo. Our current thinking about the flow is in the wireframe; see `WIREFRAME.md`.

RE-IQ is organized around the monthly close, the job an asset manager actually does: reports come
in from the property managers, the asset manager reads the month, asks about what missed budget,
decides what to do, and reports to the owners. Next month shows whether the fixes worked.

Ingestion is upload-only. PMS API connectors are on hold because of their cost (the connector cards
are commented out in `components/data-sources/data-sources-view.tsx` and `lib/data/mock/catalog.ts`).
The cheaper path to automation later is an email-in address per org, with each property manager's
system emailing scheduled reports to it, all going through the same upload parser.

The demo is Jordan Reyes, Asset Manager at Alder Peak Capital, on Oct 18, 2026, partway through the
September close (14 properties, four property managers).

| # | Stage | Question it answers | Screen | Demo state on Oct 18 |
|---|---|---|---|---|
| 0 | Setup (once) | — | Signup → upload T12 and budget → mapping review | On `testing`: empty workspace, example reports one click away |
| 1 | Reports in | Is the month complete? | **Close** (`/app/close`) | 11 of 14 ready. Lakeline's rent roll and Magnolia's AR aging are missing; Hickory's T12 was an unreadable PDF; Magnolia's T12 needs 2 mappings confirmed. Copy a reminder per manager. |
| 2 | Read the month | How did we do against budget? | Overview, Performance | September NOI is $142K below budget across the 12 posted properties |
| 3 | Investigate | Where are we losing money? | Insight drawer → property → evidence | Lakeline vacancy and concessions, Mesa Verde HVAC, Peachtree utilities, Willow Bend contract labor |
| 4 | Ask managers | Why did it happen? | **Questions** (`/app/questions`) | 9 lines over $3K and 10% worse than budget. Willow payroll accepted; Mesa R&M and Lakeline concessions answered, waiting on Jordan; Lakeline vacancy and Peachtree utilities awaiting a reply; 4 drafts to send |
| 5 | Decide | What do I do this week? | Actions | 5 new, 2 in progress |
| 6 | Report to owners | What do the owners need to know? | **Owner report** (`/app/report`) | Draft: September summary, property table with accepted explanations, what's in progress, results, opportunities |
| 7 | Did it work? | Did last month's fixes pay off? | Actions (Done), Owner report, Overview strip | Camelback irrigation repair (~$10K recovered since July) and the Gulch Terrace concession reset (~$55K since June). Willow hiring is measuring from November. |

The Overview opens with a five-step **September close** strip (reports, review, ask, decide, report)
that links into each stage and shows NOI recovered by completed actions.

## Where the logic lives

- `lib/data/close.ts`: required reports, due date (10 days after month end), per-property slots, reminder text.
- `lib/data/questions.ts`: the variance threshold, question drafting, seeded September replies.
- `lib/data/actions.ts`: `listOutcomes` compares a line's monthly variance after a fix with the three months before.
- `lib/data/report.ts`: the owner report and the close-progress steps.
- Required reports, the due day, and the question threshold are constants today; they become org settings.

## Core vs. expansion

- Core: Close, Questions, Actions, outcome tracking. They are the monthly job; without them there is no habit.
- Expansion: the owner report is the investor-reporting module, and it is what investor seats read.
- Email-in and scheduled-report ingestion is the automation module that replaces connectors.

## Not built yet

- Email: reminders and questions are copied to the clipboard; nothing is sent. Replies are pasted in by hand.
- Property managers have no login or reply link.
- Questions don't turn into actions, and accepted explanations don't feed the AI summary.
- One month only: there's no month picker and no history of past closes or reports.
- Outcome baselines are a simple three-month average. Seasonality isn't modeled beyond what the budget already has.
