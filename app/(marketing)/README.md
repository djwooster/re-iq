# (marketing)

Public pages, starting with `/`: a landing page that collects early-access emails.
Sections live in `components/marketing`; the page only composes them.

Signups go through the `joinWaitlist` server action (`actions.ts`) to
`lib/waitlist.ts`, which inserts a row into the Supabase `waitlist` table
(`supabase/waitlist.sql`: email, source, submitted_at; one row per email). Set
`SUPABASE_URL` and `SUPABASE_SECRET_KEY` (server-only). Without them, development
appends to `.data/waitlist.jsonl` (gitignored) and production returns an error
instead of dropping the signup.

The page follows the buyer's month: hero (packages in, ranked list out, `hero-flow.tsx`),
"What RE-IQ does" (`what-we-do.tsx`: read, check, rank), Grow (NOI found and
its value, surfaced early because it's the strongest pitch), the month-end
bento (`month-bento.tsx`: four cards, each with a looping illustration built in
code, `*-art.tsx`, paced by `use-cycle.ts`), then one section per pain:
ingest, reconcile, explain. Then who it's for and the final CTA. Every section
ends with `SectionCta` (early access plus a demo deep link).

Every illustration is built in code as a small looping diagram (`*-art.tsx`):
one idea each, real sample numbers, theme-aware. `use-cycle.ts` paces them; they
loop only while on screen and hold their final frame under reduced motion.

The illustrations hard-code numbers from the sample portfolio (Q3 2026, data through
Sep 30) so they match the demo. If the seeded stories change, update them.
