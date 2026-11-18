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
  "if this email has an account". Redirects accept only in-app paths (`safeNext`, `demoTarget`).
- Google and Microsoft sign-in show a generic message if they fail to start or return an error.
- Without `NEXT_PUBLIC_SUPABASE_*`, sign-in falls back to the demo, so a deploy without keys still runs.

**Organizations and roles** (`supabase/migrations`)
- Every user belongs to orgs through `org_members` with a role: `owner`, `member` or `uploader`.
- Self sign-up (any method) creates a new org and makes that person its owner.
- Uploaders (property managers) never create an org. An owner invites them (`org_invites`):
  - the token is stored only as a SHA-256 hash and shown once, in the invite link;
  - emails are stored lowercased and trimmed, and acceptance requires the signed-in user's
    confirmed email to match (case-insensitive);
  - invites expire after 7 days, work once, and an owner of that org can revoke a pending one;
  - any failure returns the same generic error.
- An uploader belongs to exactly one org, and no account is both an uploader and an owner/member.
  The database enforces this on `org_members` for every writer (unique index plus a trigger), and
  `create_org_invite` refuses invites that could never be accepted.
- Uploaders sign in with email and password only. An uploader membership grants nothing through
  Google or Microsoft: the OAuth callback signs such sessions out, and `resolveAccess` ignores
  uploader roles on OAuth sessions.
- Uploaders can't open `/app`: `proxy.ts` sends them to `/upload`, and server functions call
  `requireDashboardUser()` before touching real data. In the database, customer-data policies use
  `private.is_org_reader()` (owners and members only).
- Server functions for invites, no UI yet: `createInvite()`, `revokeInvite()`, `acceptInvite()` in
  `lib/auth/invites.ts`.

**Row-level security** (final policies; RLS is on for every table)

| Table | Policy | Who | Rule |
|---|---|---|---|
| `orgs` | members read their orgs | authenticated, SELECT | `private.is_org_member(id)` |
| `org_members` | users read their own memberships | authenticated, SELECT | `user_id = auth.uid()` |
| `org_invites` | owners read their org's invites | authenticated, SELECT | `private.is_org_owner(org_id)` |
| `waitlist` | none | none | only the server's secret key writes it |
| `private.rate_limits` | none | none | not exposed by the API; service role only |

- No INSERT, UPDATE or DELETE policies on `orgs`, `org_members` or `org_invites`, and those grants are
  revoked from `anon` and `authenticated`; `anon` has no SELECT either.
- Writes happen only in security-definer functions with `search_path = ''`, each checking the caller
  itself: `private.handle_new_user` (sign-up trigger), `create_org_invite` and `revoke_org_invite`
  (caller must own the org), `accept_org_invite` (caller's confirmed email must match).

**Database functions**

The API (PostgREST) exposes `public` and `graphql_public`. Internal functions live in `private`,
which it doesn't expose. New functions in `public` get no EXECUTE by default.

| Function | Schema | Security definer | EXECUTE | Called by |
|---|---|---|---|---|
| `create_org_invite(uuid, text, text)` | public | yes | authenticated | `createInvite` |
| `revoke_org_invite(uuid)` | public | yes | authenticated | `revokeInvite` |
| `accept_org_invite(text)` | public | yes | authenticated | `acceptInvite` |
| `rate_limit_hit(text, int, int)` | public | yes | service_role | `lib/auth/rate-limit.ts` |
| `is_org_member(uuid)`, `is_org_owner(uuid)`, `is_org_reader(uuid)` | private | yes | authenticated (RLS runs as the user) | policies |
| `handle_new_user()` | private | yes | nobody (trigger only) | `auth.users` insert |
| `enforce_membership_rules()` | private | yes | nobody (trigger only) | `org_members` writes |
| `hit_rate_limit(text, int, int)` | private | yes | nobody directly | `rate_limit_hit` |

To re-check on a project: in the SQL editor,
`select n.nspname, p.proname, p.prosecdef, p.proacl from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'private', 'graphql_public');`

**Demo isolation**
- A demo session (the `/demo` cookie) is recognised from cookies before any Supabase client is
  created, so it never gets a Supabase session, an org ID or a database query.
- Opening `/demo` while signed in for real shows "You'll be signed out to view the demo" (`/demo/switch`);
  signing out happens only when that form is posted, never on a GET. A real sign-in drops the demo cookie.

**Rate limits** (`lib/auth/rate-limit.ts`)
- Sign-in 5 per email / 20 per IP per 15 minutes; sign-up and password reset 3 per email / 5 per IP
  per hour; invite acceptance 5 per account / 10 per IP per hour.
- Stored in `private.rate_limits`, reached only through `public.rate_limit_hit` (service role only).
  IPs and emails are stored as HMAC-SHA256 with the server-only `RATE_LIMIT_HMAC_SECRET`.
- Limited requests get the same generic messages as other failures.
- If the store is unreachable or not configured (no secret, or `SUPABASE_SECRET_KEY` belongs to a
  different project than auth): sign-in fails open; sign-up, password reset and invite acceptance
  fail closed with "Something went wrong on our side. Try again shortly." Each case is logged as
  `rate_limit.fail_open` / `rate_limit.fail_closed`, with the action name only.
- A pg_cron job deletes rows older than 24 hours, hourly. Without pg_cron, run
  `delete from private.rate_limits where window_start < now() - interval '24 hours';` from any
  scheduled job (for example a Vercel cron route using the service role).

**Logging** (`lib/logger.ts`)
- One JSON line per event; callers pass event names and non-personal fields only, and field names
  that look sensitive (email, token, password, IP, name, amounts…) are redacted as a backstop.

**Secrets**
- Server-only: `SUPABASE_SECRET_KEY` (read in `lib/supabase/admin.ts` and `lib/waitlist.ts`) and
  `RATE_LIMIT_HMAC_SECRET`. The only `NEXT_PUBLIC_` values are the Supabase URL, the publishable key
  and a dev-tools flag.

**Dependencies**
- Next.js 16.4.6 (patched for the `use cache` advisories).

## Tests

`npm test` (Vitest). Database tests need `TEST_SUPABASE_*` (local Supabase or staging) and refuse to
run against production; without those variables they skip. CI runs all of them against a local
Supabase (`.github/workflows/test.yml`).

- `org-isolation`: signed in as Org A, a user can't read Org B or its members, insert themselves into
  it, change their own role, create or rename orgs, or touch Org B's invites.
- `function-access`: anon and a signed-in user can't call any internal function, in `public` or
  `private`, and can't reach `private` tables.
- `invites`: case-insensitive email match; wrong email, expired, revoked and reused invites fail;
  only an owner of the org can revoke.
- `uploader-scope`: an uploader can't join a second org or become an owner/member, and an owner can't
  be invited or inserted as an uploader, whoever writes the row.
- `demo-session`: a demo opens `/app` and leaves `/upload` without the proxy calling Supabase; `/demo`
  asks before signing out a real session; server data access refuses a demo without creating a client;
  the public key alone reads no org, membership or invite rows.
- `rate-limit`, `rate-limit-store`: limited requests return the usual messages without calling
  Supabase Auth; an unreachable store fails open for sign-in and closed for the rest, logged without
  email or IP; `rate_limit_hit` counts correctly and is closed to the public key.

## Untested until a database is connected

Built, type-checked, and covered by the tests that don't need a database. Not yet run against a real
Supabase (local or staging):
- The migrations themselves, and all database tests.
- The sign-up → confirm email → sign in → reset password loop, and Google and Microsoft sign-in.
- Uploader routing end to end (invite → sign up → accept → `/upload`, kept out of `/app`).
- Rate limits and the cleanup job against real tables.

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
- Apply the migrations with the Supabase CLI (above).
- In `.env.local` and in Vercel's Preview environment (not Production), all for staging:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`,
  `SUPABASE_SECRET_KEY`, and `RATE_LIMIT_HMAC_SECRET` (`openssl rand -hex 32`; a different value per
  environment). Optionally `TEST_SUPABASE_*` in `.env.local` to run the database tests against staging.
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

## Backlog

- Invite and uploader UI: the `/invite` page and the uploader's sign-in offer email and password
  only, never Google or Microsoft buttons. Owners get an "Invite uploader" screen with revoke.
- Confirmation required for every destructive action (revoking invites, removing members, deleting
  data), with a POST, never a GET.
- Append-only `audit_log` wired into sign-in, sign-up, invites, uploads, exports, settings and
  mapping approvals.
- Private storage with `{org_id}/{property_id}/…` paths, org-scoped storage policies, and
  short-lived signed URLs; upload size and count quotas per org.
- Bot protection on sign-up (Cloudflare Turnstile recommended; Supabase Auth verifies it).
- From the security plan, needing no auth: Sentry with scrubbing, `/api/health`, a lint guard on
  `NEXT_PUBLIC_` secrets, security headers and CSP, CI typecheck/lint/build with Dependabot, CodeQL
  and gitleaks, and the provider-agnostic `lib/ai`.

## Deferred

- Sentry alerts on `rate_limit.fail_open` / `rate_limit.fail_closed` (needs Sentry first).
- Moving rate limiting to a dedicated store (e.g. Upstash Redis via the Vercel Marketplace) if load
  requires it.
- A faster CI database job (excluding unused Supabase services) if `supabase start` gets slow.
