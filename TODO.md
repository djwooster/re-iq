# TODO

## Product
- [ ] Refined microinteractions (Rive-style, subtle), once the core flow is validated.
- [ ] "Ask" interface for natural-language questions about the portfolio.
- [ ] New-organization onboarding: signup currently enters the demo org; a fresh org should
      start empty and point every empty state at uploading a first report.
- [ ] Phase 2 write-back to property management systems, with approvals.
- [ ] Marketing site: landing page with waitlist is live at `/`; add pricing, security, and set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in Vercel so signups reach Supabase.

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
