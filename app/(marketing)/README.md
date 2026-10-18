# (marketing)

Public pages, starting with `/`: a landing page that collects early-access emails.
Sections live in `components/marketing`; the page only composes them.

Signups go through the `joinWaitlist` server action (`actions.ts`) to
`lib/waitlist.ts`. Set `WAITLIST_WEBHOOK_URL` to receive each signup as a JSON POST
(`{ email, source, submitted_at }`). Without it, development appends to
`.data/waitlist.jsonl` (gitignored) and production returns an error instead of
dropping the signup.

Example numbers on the page come from the sample portfolio (Q3 2026). If the
seeded stories change, update `product-preview.tsx` and `sections.tsx`.
