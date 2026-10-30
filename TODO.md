# TODO

## Business (see `STRATEGY.md`)
- [ ] Decide the price book: unit price, platform minimum, tiers, and which modules are add-ons.
- [ ] Model plans as entitlements (`lib/billing/plans.ts`) before the first paid customer.
- [ ] Standard design-partner contract: annual, auto-renewing, time-boxed discount, PIIA for contributors.
- [ ] Track time to first insight for new workspaces (start with the usability sessions).

## Product
- [ ] Refined microinteractions (Rive-style, subtle), once the core flow is validated.
- [ ] "Ask" interface for natural-language questions about the portfolio.
- [ ] New-organization onboarding: signup currently enters the demo org; a fresh org should
      start empty and point every empty state at uploading a first report.
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
- [x] Marketing page restructured around the buyer's month (replaces the hidden checklist band).
- [ ] Marketing: blog at `/blog` with the eight drafted post ideas (deferred).
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
