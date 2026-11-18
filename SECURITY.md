# Security

RE-IQ holds owners' financials, residents' and employees' personal data, and bank details. This file
says what protects them today, what still has to be checked once a staging project exists, and the
manual steps that only DJ can do (dashboards, DNS, secrets).

## In place

**Auth** (`lib/supabase`, `lib/auth`, `proxy.ts`)
- Supabase Auth with email and password, Google, and Microsoft. Sessions live in Supabase's cookies,
  verified and refreshed by `proxy.ts` on every request (`getClaims`).
- Sign-up confirms the email before the account can sign in. Password reset goes through emailed,
  single-use links (`/auth/confirm`); OAuth returns through `/auth/callback`.
- Generic errors: a wrong password and an unknown email look the same; password reset always says
  "if this email has an account". Redirects after sign-in accept only in-app paths (`safeNext`).
- Without `NEXT_PUBLIC_SUPABASE_*`, sign-in falls back to the demo, so a deploy without keys still runs.

**Organizations and roles** (`supabase/migrations`)
- Every user belongs to orgs through `org_members` with a role: `owner`, `member` or `uploader`.
- Self sign-up (any method) creates a new org and makes that person its owner.
- Uploaders (property managers) never create an org; an owner invites them (`org_invites`, token
  stored only as a SHA-256 hash, 7-day expiry, one use, must match the invitee's confirmed email).
- Uploaders sign in with email and password only. An uploader membership grants nothing through
  Google or Microsoft: the OAuth callback signs such sessions out, and `resolveAccess` ignores
  uploader roles on OAuth sessions.
- Uploaders can't open `/app`: `proxy.ts` sends them to `/upload`, and server functions call
  `requireDashboardUser()` before touching real data. In the database, customer-data policies use
  `is_org_reader()` (owners and members only).
- Server functions for invites: `createInvite()` and `acceptInvite()` in `lib/auth/invites.ts`
  (no UI yet).

**Row-level security** (final policies; all three tables have RLS on)

| Table | Policy | Who | Rule |
|---|---|---|---|
| `orgs` | members read their orgs | authenticated, SELECT | `is_org_member(id)` |
| `org_members` | users read their own memberships | authenticated, SELECT | `user_id = auth.uid()` |
| `org_invites` | owners read their org's invites | authenticated, SELECT | `is_org_owner(org_id)` |

- No INSERT, UPDATE or DELETE policies on these tables, and those grants are revoked from `anon` and
  `authenticated`; `anon` has no SELECT either.
- Writes happen only in security-definer functions with `search_path = ''`: `handle_new_user`
  (sign-up trigger), `create_org_invite` (checks the caller owns the org) and `accept_org_invite`.
- `waitlist`: RLS on, no policies; only the server's secret key writes it.

**Demo isolation**
- A demo session (the `/demo` cookie) is recognised from cookies before any Supabase client is
  created, so it never gets a Supabase session, an org ID or a database query. Entering `/demo`
  drops any Supabase session cookies; a real sign-in drops the demo cookie.

**Rate limits** (`lib/auth/rate-limit.ts`, table `rate_limits`)
- Sign-in 5 per email / 20 per IP per 15 minutes; sign-up and password reset 3 per email / 5 per IP
  per hour; invite acceptance 5 per account / 10 per IP per hour.
- Stored in Supabase (`private.rate_limits`, reached only through `public.rate_limit_hit`, which only
  the service role can execute). IPs and emails are stored as HMAC-SHA256 with the server-only
  `RATE_LIMIT_HMAC_SECRET`, never in plain text or as plain hashes. Limited requests get the same generic messages. The limiter fails open if its store is
  unreachable, and switches off if `SUPABASE_SECRET_KEY` belongs to a different project than auth.

**Secrets**
- The secret key (`SUPABASE_SECRET_KEY`) is read only in server-only modules
  (`lib/supabase/admin.ts`, `lib/waitlist.ts`). The only `NEXT_PUBLIC_` values are the Supabase URL,
  the publishable key and a dev-tools flag.

**Dependencies**
- Next.js 16.4.6 (patched for the `use cache` advisories); `npm audit` clean at the time of writing.

## Tests

`npm test` (Vitest). Database tests need a staging project in `TEST_SUPABASE_*` and refuse to run
against production; without those variables they skip.

- `tests/org-isolation.test.ts`: signed in as Org A, a user can't read Org B or its members, insert
  themselves into it, change their own role, create or rename orgs, or touch Org B's invites. An
  invited uploader joins without creating an org and isn't a dashboard reader; invites are one-use
  and bound to the invited email.
- `tests/demo-session.test.ts`: a demo session opens `/app` and is turned away from `/upload` without
  the proxy calling Supabase; server data access refuses it without creating a client; against the
  database, the public key alone reads no org, membership or invite rows.
- `tests/rate-limit.test.ts`: limited sign-in, sign-up and reset return the usual messages without
  calling Supabase Auth; `hit_rate_limit` counts correctly and is closed to the public key.

## Untested until staging keys exist

Everything above is built, type-checked and passes the tests that don't need a database. These
haven't run against a real Supabase project yet:
- The full sign-up → confirm email → sign in → reset password loop, and Google and Microsoft sign-in.
- The migrations themselves, and all database tests (12 skipped today).
- Uploader routing end to end (invite → sign up → accept → `/upload`, kept out of `/app`).
- Rate limits against the real table.

## Database migrations (Supabase CLI)

Migrations live in `supabase/migrations/` and apply in filename order (`YYYYMMDDHHMMSS_name.sql`).
The CLI is a dev dependency, so every command runs through `npx`. `supabase/config.toml` configures
the local stack only; hosted projects' Auth settings are set in their dashboards (manual steps below).

New migration: `npx supabase migration new <name>`, then edit the file it creates.

Local (needs Docker):
```sh
npx supabase start          # local Postgres, Auth, API; applies every migration
npx supabase db reset       # re-apply from scratch after editing migrations
npx supabase status -o env  # local URL and keys, for TEST_SUPABASE_* when running npm test
npx supabase stop
```

Staging:
```sh
npx supabase login                                  # once, opens the browser
npx supabase link --project-ref <staging-ref>       # asks for the staging database password
npx supabase db push --dry-run                      # lists what would run; check it
npx supabase db push
```

Production (at launch, only after the same migrations ran clean on staging):
```sh
npx supabase link --project-ref dixlcrxxnmoivfrnvaqv
# The waitlist table was created by hand before the CLI; record it as applied so push skips it.
npx supabase migration repair --status applied 20261027000000
npx supabase db push --dry-run
npx supabase db push
npx supabase link --project-ref <staging-ref>       # point the CLI back at staging
```

## Manual steps (DJ)

**1. Staging project**
- Create a Supabase project for staging (free tier).
- Apply the migrations with the Supabase CLI (see "Database migrations" below).
- In `.env.local` and in Vercel's Preview environment (not Production): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_URL` + `SUPABASE_SECRET_KEY` pointing at the
  same staging project. Add `TEST_SUPABASE_*` (staging) to `.env.local` to run the database tests.
- Restart the dev server.

**2. Supabase Auth settings (staging now, production at launch)**
- Email: keep "Confirm email" on.
- Passwords: minimum length 8, and turn on leaked-password protection (checks HaveIBeenPwned).
- URL configuration: Site URL is the app's URL. Redirect URLs only:
  - `http://localhost:3000/**`
  - our own Vercel preview pattern, e.g. `https://re-iq-*-<vercel-scope>.vercel.app/**`
  - the production domain once it exists.
  No broad wildcards (not `https://*.vercel.app/**`).
- Email templates:
  - Confirm signup link: `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`
  - Reset password link: `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery`
- Providers: enable Google (OAuth client from Google Cloud) and Azure for Microsoft (Entra app
  registration), each with the callback URL Supabase shows.

**3. Email delivery before launch**
- Supabase's built-in email is rate-limited and not for production. Set custom SMTP to Resend
  (Authentication → SMTP settings) once Resend is set up.
- Resend asks for DNS records on the sending domain: an SPF TXT record and an MX record on its
  `send` subdomain, and a DKIM TXT record (`resend._domainkey`). Add them in Vercel DNS exactly as
  Resend shows them.
- Add a DMARC TXT record at `_dmarc.<domain>`: start with
  `v=DMARC1; p=none; rua=mailto:<reports address>`, then tighten to `p=quarantine` once reports
  show only Resend sending for the domain.

## Next

From the security plan, in order:
- **No auth needed:** Sentry with scrubbing, a redacting logger, `/api/health`, `server-only` checks
  and a lint guard on `NEXT_PUBLIC_` secrets, security headers and CSP, `.env.example` and staging
  for every environment, CI (typecheck, lint, tests incl. isolation, build) with Dependabot,
  CodeQL and gitleaks, and the provider-agnostic `lib/ai`.
- **Needs auth (now built):** append-only `audit_log` wired into sign-in, sign-up, uploads, exports,
  settings and mapping approvals; private storage with `{org_id}/{property_id}/…` paths and
  short-lived signed URLs; bot protection on sign-up (Cloudflare Turnstile recommended); upload size
  and count quotas; the invite UI and `/invite` page; the uploader's upload page.
- Move rate limits to Upstash Redis if sign-in traffic grows (free tier via the Vercel Marketplace).
