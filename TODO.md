# TODO

## Business (see `STRATEGY.md`)
- [ ] Decide the price book: unit price, platform minimum, tiers, and which modules are add-ons.
- [ ] Model plans as entitlements (`lib/billing/plans.ts`) before the first paid customer.
- [ ] Standard design-partner contract: annual, auto-renewing, time-boxed discount, PIIA for contributors.
- [ ] Track time to first insight for new workspaces (start with the usability sessions).

## Next up (as of 2026-10-30)
- [ ] Restart the dev server and check the hero's file-tag colors (XLS green, PDF red, CSV blue);
      the running server doesn't pick up `app/globals.css` edits.
- [ ] Usability sessions: turn off Vercel preview protection for `testing`, run the first
      participants through `/demo?fresh=1`, then decide whether the empty-workspace flow merges to `main`.
- [ ] App design pass, starting now: bring the marketing page's motion language and polish into the
      product (see Product below). Decide where to start (Overview is the likely first screen).
- [ ] Marketing copy before launch: "What RE-IQ does" says the math is checked, Reconcile says
      "designed to"; make them consistent with what the product actually does.
- [ ] Marketing: phone-width and reduced-motion check of every illustration (DJ, in the browser).
- [ ] Marketing: give the Ingest illustration's file tags the same format colors as the hero.
- [ ] Marketing: share image and meta (Open Graph) for links posted to LinkedIn, Slack, and email.

## Product
- [ ] Design system pass: bring the marketing illustrations' micro-animations (fade + 8px rise,
      check-ins, cycling highlights; `components/marketing/*-art.tsx`, `use-cycle.ts`) into the app.
- [ ] Refined microinteractions (Rive-style, subtle), once the core flow is validated.
- [ ] "Ask" interface for natural-language questions about the portfolio.
- [x] New-organization onboarding: signup starts an empty workspace; empty states point at
      uploading a first T12 (on `testing`, for usability sessions; merge to `main` once confirmed).
- [ ] Empty workspace: require an uploaded budget before showing budget variance, and let a
      file with an unrecognized name create a new property instead of picking a sample one.
- [ ] Phase 2 write-back to property management systems, with approvals.
- [ ] Marketing site: landing page with waitlist is live at `/`; add pricing and security pages.
- [ ] Waitlist on Supabase (live and working since 2026-10-27; tidy-up left):
  - [x] Supabase MCP connected (`.mcp.json`, project `dixlcrxxnmoivfrnvaqv`).
  - [x] Old Dearly Found data exported to `.data/dearly-found-export/` (gitignored), then cleared.
  - [x] `waitlist` table created from `supabase/waitlist.sql`.
  - [x] Supabase dashboard: old buckets deleted, old keys revoked, project renamed.
  - [x] Put `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local`; test a signup locally.
  - [x] Add both to Vercel production (DJ runs `vercel env add`; agent writes to Vercel secrets are blocked).
  - [x] Push and test a live signup.
  - [ ] Notion leftovers: `.env.local` lines and the database (in Notion's Trash) are gone; DJ still
        removes `NOTION_TOKEN` from Vercel and deletes the "RE-IQ site" integration.
- [x] Marketing page restructured: hero diagram, what RE-IQ does, grow, month-end bento,
      ingest, reconcile, explain, who it's for, final CTA. Every illustration is coded (`*-art.tsx`)
      and every section ends with a CTA that deep-links into the demo (`/demo?to=`).
- [ ] Light-mode palette: dark mode moved to charcoal / star dust / steel teal on 2026-10-30;
      decide whether light mode gets matching warmth or stays as is.
- [ ] Marketing: blog at `/blog` with the eight drafted post ideas. Open: full posts vs. titles and
      summaries, and MDX in the repo vs. a CMS Brian can post to.
- [ ] Marketing: confirm before launch that we can deliver the "forward last quarter's packages,
      get a free portfolio review" offer and the RE-IQ inbox the copy describes.

## Data ingestion
- [ ] Real report parsing pipeline: Excel/CSV/PDF → AI extraction → account mapping with
      confidence → user review. Learn mappings per property manager over time so repeat
      uploads need less review.
- [ ] Email-in ingestion: forward monthly report emails to an org address.
- [ ] Direct connectors: ResMan and Rent Manager first (directly or via a unified PMS API
      vendor); Yardi through its interface partner program once we have qualifying
      customers.

## Platform
- [ ] Supabase: schema and migrations from `lib/types`, file storage for uploads, and
      swapping `lib/data/*` internals onto it.
- [ ] Real auth, organizations and members, row-level security on `org_id`, invite flow
      with email.
