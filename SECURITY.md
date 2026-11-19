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
  - any failure returns the same generic error; refusing to create an invite (not the owner, or an
    account that could never accept it) always says "This person can't be invited to your organization."
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
- A pg_cron job deletes rows older than 24 hours, hourly. The migration enables pg_cron itself
  (`create extension pg_cron with schema pg_catalog`, Supabase's documented SQL route), so there's
  no dashboard step; it shows under Integrations → Cron once the migration has run. Without pg_cron, run
  `delete from private.rate_limits where window_start < now() - interval '24 hours';` from any
  scheduled job (for example a Vercel cron route using the service role).

**Logging** (`lib/logger.ts`)
- One JSON line per event; callers pass event names and non-personal fields only, and field names
  that look sensitive (email, token, password, IP, name, amounts…) are redacted as a backstop.
- `log.warn` and `log.error` also go to Sentry with the same redacted fields, including the
  rate-limit `fail_open` / `fail_closed` events.

**Error tracking: Sentry** (`instrumentation.ts`, `instrumentation-client.ts`, `lib/sentry`)
- Free plan, US region: org `re-iq`, project `re-iq` (Next.js). Browser, Node and edge runtimes share
  one set of options. Without `SENTRY_DSN`, Sentry never starts.
- Privacy: `sendDefaultPii: false`. Before anything is sent (`beforeSend`, `beforeBreadcrumb`), request
  bodies, cookies, all headers and query strings are dropped, email addresses are masked anywhere in
  the event, and the user is reduced to an ID with `ip_address: null`. Events carry the user ID and,
  when the user belongs to exactly one org, an `org_id` tag; never names or emails. Browser events
  tell Sentry never to infer an IP; server events can only show the server's location (Vercel's region).
- The `re-iq` project has Sentry's server-side data scrubber (with defaults) and "Prevent Storing of IP
  Addresses" turned on, as a second net behind our own scrubbing.
- Errors, tracing and logs. Our logger sends every event to Sentry Logs (redacted, and emails masked
  again by `beforeSendLog`); warnings and errors also open issues. No session replay.
- Tracing keeps every trace locally and 10% on preview and production.
- Every event is tagged with its environment: `local`, `preview` or `production` (from Vercel).
- Source maps upload at build time when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` are set,
  then are deleted from the deployment. The token is build-time only and never reaches the browser.

**Security headers** (`next.config.ts`, every route including API routes)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains` (no preload yet)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- No Content-Security-Policy yet (see Deferred).

**Secrets**
- Server-only: `SUPABASE_SECRET_KEY` (read in `lib/supabase/admin.ts` and `lib/waitlist.ts`),
  `RATE_LIMIT_HMAC_SECRET`, and the build-time `SENTRY_AUTH_TOKEN`. The only `NEXT_PUBLIC_` values are
  the Supabase URL, the publishable key, the Sentry DSN (not a secret) and a dev-tools flag.

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
- `sentry`: request bodies, cookies, headers, query strings and emails never reach Sentry (events,
  breadcrumbs, logs); the user is an ID only, with no IP; every log level reaches Sentry Logs and only
  warnings and errors open issues, all with redacted fields.
- `security-headers`: the four headers apply to every path (pages and API routes alike).

Verified on 2026-11-19 against a local Supabase (`npx supabase start`): all 9 migrations apply
cleanly, all 50 tests pass, the cleanup cron job is scheduled, and function grants match the table
above. The production build serves every route with the headers.

Staging (`re-iq-staging`, `rtmtepejzkflhbmznbgo`), 2026-11-19: all 9 migrations applied with
`db push --remote`; tables, RLS, function grants and the cleanup job match the local database. The
security advisor reports only the three intended client-callable invite functions (each checks the
caller itself).

Production (`dixlcrxxnmoivfrnvaqv`), 2026-11-19: the hand-made waitlist table matched
`20261027000000_waitlist.sql` exactly (columns, constraints, RLS, no policies); its 2 rows were
exported to a private file outside the repo first. Migration history repaired (old `20261028023558
create_waitlist` entry marked reverted, `20261027000000` marked applied; history only), then the other 8
migrations applied with `db push --remote`. History 9 of 9 in sync; tables, RLS, policies, function
grants and the cleanup job match staging; waitlist rows intact; the advisor reports only the three
intended invite functions.

Sentry verified end to end on 2026-11-19: a test error thrown by a temporary route in the production
build reached the `re-iq` project (issue RE-IQ-1, environment `local`) with only the request method and
URL, no headers, cookies or body. Its stack trace was minified, as expected without source maps.

## Untested until staging

- The sign-up → confirm email → sign in → reset password loop with real emails, and Google and
  Microsoft sign-in.
- Uploader routing end to end in the browser (invite → sign up → accept → `/upload`, kept out of `/app`).
- Sentry from a Vercel deployment: `preview`/`production` environments, a browser error, and source-map
  upload (readable stack traces) once `SENTRY_AUTH_TOKEN` is set.
- HSTS over HTTPS (browsers ignore it on `http://localhost`).

## Database migrations (Supabase CLI)

Migrations live in `supabase/migrations/` and apply in filename order (`YYYYMMDDHHMMSS_name.sql`).
The CLI is a dev dependency, so every command runs through `npx`. `supabase/config.toml` configures
the local stack only; hosted projects' Auth settings are set in their dashboards (manual steps below).

New migration: `npx supabase migration new <name>`, then edit the file it creates.

Local (needs Docker):
```sh
npx supabase start          # local Postgres, Auth, API (port 55321; 54321 clashes with CleanMyMac)
npx supabase db reset       # re-apply from scratch after editing migrations
npx supabase status -o env  # local URL and keys, for TEST_SUPABASE_* when running npm test
npx supabase stop
```

Staging:
```sh
npx supabase login                                  # once, opens the browser
npx supabase link --project-ref <staging-ref>       # asks for the staging database password
npx supabase db push --remote --dry-run             # lists what would run; check it
npx supabase db push --remote
```
CLI 3.x targets the local database unless you pass `--remote`. Read-only checks against a hosted
project: `npx supabase db query --remote --read-only "<sql>"` and
`npx supabase db advisors --remote --type security`.

Production (at launch, only after the same migrations ran clean on staging):
```sh
npx supabase link --project-ref dixlcrxxnmoivfrnvaqv
# Done once on 2026-11-19: production's hand-made waitlist migration (20261028023558) was marked
# reverted and 20261027000000 marked applied. Future production pushes need no repair.
npx supabase db push --remote --dry-run
npx supabase db push --remote
npx supabase link --project-ref <staging-ref>       # point the CLI back at staging
```

## Manual steps (DJ)

**1. Staging project**
- Create a Supabase project for staging (free tier).
- Apply the migrations with the Supabase CLI (above).
- In `.env.local` and in Vercel's Preview environment (not Production), all for staging:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`,
  `SUPABASE_SECRET_KEY`, and `RATE_LIMIT_HMAC_SECRET` (`openssl rand -hex 32`). Optionally
  `TEST_SUPABASE_*` in `.env.local` to run the database tests against staging.
- `RATE_LIMIT_HMAC_SECRET` must be different in every environment (local, preview/staging,
  production), so identifiers from one environment's table can't be matched in another's. Never
  reuse it across environments or commit it; rotating it only resets the counters.
- Restart the dev server.

**Environment variables, where each goes**

| Variable | `.env.local` | Vercel Preview | Vercel Production |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | staging | staging | production |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | staging | staging | production |
| `RATE_LIMIT_HMAC_SECRET` | its own value | its own value | its own value |
| `SENTRY_DSN` | optional (leave empty to keep Sentry off locally) | yes | yes |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | no | yes | yes |
| `TEST_SUPABASE_*` | optional (local or staging) | no | no |

**2. Supabase Auth settings (staging now, production at launch)**
- Email: keep "Confirm email" and "Secure email change" on.
- Passwords: minimum length 8, and turn on leaked-password protection (checks HaveIBeenPwned).
- URL configuration, **staging** (test data only):
  - Site URL `http://localhost:3000`.
  - Redirect URLs `http://localhost:3000/**` and our own preview pattern
    `https://re-iq-*-dwoosty.vercel.app/**`. This vercel.app wildcard is acceptable on staging only,
    because staging holds test data.
- URL configuration, **production**: until we have a custom domain, Site URL `https://re-iq.vercel.app`
  and Redirect URLs exactly `https://re-iq.vercel.app/**` (production's own site, no wildcard in the
  host). Once the domain exists, both switch to it exactly (e.g. `https://<domain>/**`). Never a
  vercel.app pattern such as `re-iq-*`, never localhost, never a broad wildcard.
- These settings and both email templates live in `supabase/config.toml` (`[remotes.staging]`,
  `[remotes.production]`) and are applied with `npx supabase config diff --remote=<ref>`, then
  `npx supabase config push --remote=<ref>`. Leaked-password protection is a dashboard-only toggle.

Staging, done 2026-11-19: confirm email, 8-character minimum, leaked-password protection and secure
email change on; redirect URLs set as above.
- Email templates:
  - Confirm signup link: `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`
  - Reset password link: `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery`
- Providers: enable Google (OAuth client from Google Cloud) and Azure for Microsoft (Entra app
  registration), each with the callback URL Supabase shows.
- Before production: the Google OAuth consent screen and the Microsoft (Entra) app registration both
  need live Privacy Policy and Terms of Service URLs on our domain. Google won't verify (and shows
  an "unverified app" warning) without them; publish both pages first.

**3. Email delivery before launch**
- Supabase's built-in email is rate-limited and not for production. Set custom SMTP to Resend
  (Authentication → SMTP settings) once Resend is set up.
- Resend asks for DNS records on the sending domain: an SPF TXT record and an MX record on its
  `send` subdomain, and a DKIM TXT record (`resend._domainkey`). Add them in Vercel DNS exactly as
  Resend shows them.
- Add a DMARC TXT record at `_dmarc.<domain>`: start with
  `v=DMARC1; p=none; rua=mailto:<reports address>`, then tighten to `p=quarantine` once reports
  show only Resend sending for the domain.

**4. Sentry** (account, org `re-iq` in the US region, and project `re-iq` already exist; the DSN is in
`.env.local`; project-level scrubbing is on)
- Org settings → Security & Privacy: turn on "Data Scrubber" and "Prevent Storing of IP Addresses" for
  the whole org (the CLI token can't change org settings).
- In Vercel, Preview and Production: `SENTRY_DSN` (the same DSN as `.env.local`), `SENTRY_ORG=re-iq`,
  `SENTRY_PROJECT=re-iq`.
- Create an organization auth token (Settings → Auth Tokens) for source-map upload and put it in
  `SENTRY_AUTH_TOKEN` in Vercel only (Preview and Production). Never in `.env.local`, chat, or a
  `NEXT_PUBLIC_` variable. Without it, production stack traces stay minified.
- Optional: an alert rule on events named `rate_limit.fail_open` / `rate_limit.fail_closed`.

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
- From the security plan, needing no auth: a lint guard on `NEXT_PUBLIC_` secrets, CI lint and build
  with Dependabot, CodeQL and gitleaks, and the provider-agnostic `lib/ai`.

## Deferred

- Content-Security-Policy. Nonces would make every page render per request (Next.js 16 can't nonce a
  prebuilt page or a Partial Prerendering shell), so it waits until we decide between nonces on the
  signed-in routes only and a static policy elsewhere.
- Audit log (`audit_events`): append-only, owners read their org's events, wired into auth and invite
  actions, one-year retention.
- Health endpoint (`/api/health`, ok/not ok after a database check) and an uptime monitor pointed at it.
- Sentry alerts on `rate_limit.fail_open` / `rate_limit.fail_closed`.
- `Strict-Transport-Security` preload, once every subdomain is HTTPS-only.
- Moving rate limiting to a dedicated store (e.g. Upstash Redis via the Vercel Marketplace) if load
  requires it.
- A faster CI database job (excluding unused Supabase services) if `supabase start` gets slow.
