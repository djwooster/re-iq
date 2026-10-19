# (marketing)

Public pages, starting with `/`: a landing page that collects early-access emails.
Sections live in `components/marketing`; the page only composes them.

Signups go through the `joinWaitlist` server action (`actions.ts`) to
`lib/waitlist.ts`. Set `WAITLIST_WEBHOOK_URL` to receive each signup as a JSON POST
(`{ email, source, submitted_at }`). Without it, development appends to
`.data/waitlist.jsonl` (gitignored) and production returns an error instead of
dropping the signup.

Each feature section pairs short copy with an animated product vignette
(`*-visual.tsx`, including the hero). Vignettes use
`Scene` (`scene.tsx`): it plays a step timeline when scrolled into view, has a
replay button, and jumps to the final state under reduced motion.

The vignettes hard-code numbers from the sample portfolio (Q3 2026, data through
Sep 30) so they match the demo. If the seeded stories change, update them.
