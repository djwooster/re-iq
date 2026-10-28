# TODO

## Product
- [ ] Refined microinteractions (Rive-style, subtle), once the core flow is validated.
- [ ] "Ask" interface for natural-language questions about the portfolio.
- [ ] New-organization onboarding: signup currently enters the demo org; a fresh org should
      start empty and point every empty state at uploading a first report.
- [ ] Phase 2 write-back to property management systems, with approvals.
- [ ] Marketing site: landing page with waitlist is live at `/`; add pricing and security pages.
- [ ] Waitlist on Supabase (live signups fail until this is done):
  - [x] Supabase MCP connected (`.mcp.json`, project `dixlcrxxnmoivfrnvaqv`).
  - [x] Old Dearly Found data exported to `.data/dearly-found-export/` (gitignored), then cleared.
  - [x] `waitlist` table created from `supabase/waitlist.sql`.
  - [ ] In the Supabase dashboard: delete the empty-ish `avatars` and `listing-photos` buckets
        (SQL can't), revoke the old API keys and create a new secret key, rename the project.
  - [x] Put `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local`; test a signup locally.
  - [x] Add both to Vercel production (DJ runs `vercel env add`; agent writes to Vercel secrets are blocked).
  - [ ] Push `a88f09d` and test a live signup.
  - [ ] Clean up Notion leftovers: `NOTION_*` in Vercel and `.env.local`, the RE-IQ waitlist database
        and its integration.
- [ ] Rework and restore the month-end checklist band under the hero (`month-end-checklist.tsx`, hidden in `page.tsx`).

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
