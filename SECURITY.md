# Security

RE-IQ holds owners' financials, residents' and employees' personal data, and bank details. This file
says what protects them today, how database changes ship, and the manual steps only DJ can do
(dashboards, DNS, secrets).

## In place

**Auth** (`lib/supabase`, `lib/auth`, `proxy.ts`)
- Supabase Auth with email and password, Google, and Microsoft. Sessions live in Supabase's cookies,
  verified and refreshed by `proxy.ts` on every request (`getClaims`).
- Sign-up confirms the email before the account can sign in. Password reset goes through emailed,
  single-use links (`/auth/confirm`); OAuth returns through `/auth/callback`.
- Generic errors: a wrong password and an unknown email look the same; password reset always says
  "if this email has an account". Redirects accept only in-app paths (`safeNext`, `demoTarget`).
- Google and Microsoft sign-in show a generic message if they fail to start or return an error.
- Without `NEXT_PUBLIC_SUPABASE_*`, sign-in, sign-up and password reset show "Sign-in isn't available right now" (no demo fallback).

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
- Owners invite property managers from `/app/workspace/managers`, choosing the properties they may
  upload to; they can change that access per property (effective immediately), revoke pending invites
  and remove uploaders. Removals and revocations take two clicks.
- An invite link's token is moved by `proxy.ts` into an HTTP-only cookie scoped to `/invite` and the
  browser continues at a clean `/invite` URL, so the token isn't left in the address bar, a
  confirmation email or a log. `/invite` offers email-and-password sign-up or sign-in only.

**Properties and uploads** (`lib/uploads`, `lib/workspace`, `/app/workspace/*`, `/upload`)
- Owners create, edit and archive properties (`properties`: org, name, address, unit count). Owners and
  members read them; an uploader reads only the properties they're granted.
- Uploaders see a dropdown of their granted properties, pick a report type (Brian's report list by
  category, plus property photos and Other) and the month, and drop files.
- Files never pass through our server's request body (Vercel limits those to 4.5 MB):
  1. `startUpload` checks access (`can_upload`), the per-uploader rate limit and the per-org daily cap
     (500 files in 24 hours), then signs a one-time upload URL into the private **`incoming`** bucket.
  2. The browser uploads there. No client can read, list or write `incoming` otherwise.
  3. `finalizeUpload` reads the file back, checks its **actual contents** (PDF, Excel .xlsx/.xls, CSV,
     JPEG, PNG, HEIC; the extension must match the contents; macro workbooks (`vbaProject.bin`,
     `_VBA_PROJECT`) are refused however they're named; 25 MB maximum), strips photo metadata (EXIF
     including GPS, XMP, IPTC, comments), writes the result to the private **`reports`** bucket, and
     records it with `record_upload`, which re-checks access and that the file is in place. The
     `incoming` copy is deleted on success and on failure.
- Paths are `{org_id}/{property_id}/{upload_id}/{file name}`; file names are sanitized. The same file
  name for the same property, report type and month becomes a new version; nothing is overwritten.
- Downloads are 60-second signed URLs with `Content-Disposition: attachment`, created as the signed-in
  user, so the storage policy decides: owners and members of the org, or the uploader who uploaded the
  file while they still have access to its property.
- Owners and members see every upload for their org's properties (`/app/workspace/properties/[id]`,
  by month, with who uploaded and download); uploaders see only their own, per property, any month.
- Trade-off: a photo's original metadata exists for seconds in `incoming` (server-readable only)
  before it's stripped. Removing metadata also removes the photo's rotation flag, so some photos may
  display sideways.

**Row-level security** (final policies; RLS is on for every table)

| Table | Policy | Who | Rule |
|---|---|---|---|
| `orgs` | members read their orgs | authenticated, SELECT | `private.is_org_member(id)` |
| `org_members` | users read their own memberships | authenticated, SELECT | `user_id = auth.uid()` |
| `org_invites` | owners read their org's invites | authenticated, SELECT | `private.is_org_owner(org_id)` |
| `properties` | readers and granted uploaders read; owners create and edit | authenticated | `is_org_reader(org_id)` or `has_property_access(id)`; writes `is_org_owner(org_id)`, limited columns, no deletes |
| `uploader_property_access` | readers and the uploader read | authenticated, SELECT | `is_org_reader(org_id)` or `user_id = auth.uid()` |
| `uploads` | readers see the org's; uploaders their own | authenticated, SELECT | `is_org_reader(org_id)` or (`uploaded_by = auth.uid()` and `has_property_access(property_id)`) |
| `storage.objects` (`reports`) | readers and the uploading uploader read | authenticated, SELECT | `private.can_read_report_object(name)`; no client insert, update or delete |
| `storage.objects` (`incoming`) | none | none | server only |
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
| `create_org_invite(uuid, text, text, uuid[])` | public | yes | authenticated (owners) | `inviteUploader` |
| `revoke_org_invite(uuid)` | public | yes | authenticated (owners) | `revokePendingInvite` |
| `accept_org_invite(text)` | public | yes | authenticated (matching email) | `acceptInvite` |
| `set_uploader_access(uuid, uuid, uuid[])`, `remove_uploader(uuid, uuid)` | public | yes | authenticated (owners) | `setUploaderAccess`, `removeUploader` |
| `org_people(uuid)` | public | yes | authenticated (owners, members) | manager and report screens |
| `can_upload(uuid)`, `record_upload(…)` | public | yes | authenticated (owners and members of the property's org, granted uploaders) | `startUpload`, `finalizeUpload` |
| `complete_setup(uuid)` | public | yes | authenticated (owners, members) | `completeSetup` (finish or skip setup) |
| `rename_org(uuid, text)` | public | yes | authenticated (owners) | `renameOrg` |
| `has_property_access(uuid)`, `can_write_property(uuid)`, `can_read_report_object(text)`, `try_uuid(text)`, `org_upload_cap()` | private | mixed | authenticated (policies run as the user) | policies and the functions above |
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

Last verified 2026-11-19: all 10 migrations apply on local, staging and production; 91 tests pass
locally and in CI; staging and production match (tables, RLS, private buckets, function grants,
cleanup job). The security advisor flags only the eight client-callable functions in the table above,
each of which checks the caller itself. A test error reached Sentry with no headers, cookies or body.

## Not yet tested in a browser

- Sign-up → confirm email → sign in → reset password with real emails; Google and Microsoft sign-in.
- Uploader routing end to end (invite → sign up → accept → `/upload`, kept out of `/app`).
- Real uploads: large files and iPhone photos (HEIC).
- Sentry from Vercel (`preview`/`production` tags, a browser error, readable stack traces once
  `SENTRY_AUTH_TOKEN` is set) and HSTS over HTTPS.

## Environments

| | Database | Used by |
|---|---|---|
| Local | `npx supabase start` (Docker via OrbStack, API port 55321) | the database tests; trying a migration |
| Staging | `re-iq-staging` (`rtmtepejzkflhbmznbgo`), test data only | Vercel previews only; not in use for now |
| Production | `dixlcrxxnmoivfrnvaqv`, real customer data | `re-iq.vercel.app` and `npm run dev` (`.env.local`) |

DJ's call (2026-11-19): no staging for now, so localhost runs against production. That means local
sign-ups, uploads and deletions are real. Test with your own accounts, never a customer's, and never copy
production data anywhere else. Production's Auth redirect list also allows `http://localhost:3000/**` for now
(DJ approved 2026-11-19), so emailed links from a local sign-up come back to localhost; remove it when staging returns. Bring staging back before there's more than a handful of users.

| Variable | `.env.local` | Vercel Preview | Vercel Production |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | production (for now) | staging | production |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | production (for now) | staging | production |
| `RATE_LIMIT_HMAC_SECRET` (`openssl rand -hex 32`) | its own value | its own value | its own value |
| `SENTRY_DSN` | optional (empty keeps Sentry off) | yes | yes |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | no | yes | yes |
| `TEST_SUPABASE_*` | optional (local) | no | no |

`RATE_LIMIT_HMAC_SECRET` differs per environment so identifiers can't be matched across them; rotating
it only resets the counters. Secrets never go in chat, commits or `NEXT_PUBLIC_` variables.

## Database changes

Migrations live in `supabase/migrations/` and apply in filename order. Every command runs through
`npx`; CLI 3.x needs `--remote=<ref>` to target a hosted project (otherwise it targets local).

1. `npx supabase migration new <name>`, then write the SQL. New tables get RLS and `org_id`.
2. Try it locally: `npx supabase start` (or `npx supabase db reset` to re-apply from scratch), then
   `npm test` with `TEST_SUPABASE_*` from `npx supabase status -o env`.
3. Production: `npx supabase db push --remote=dixlcrxxnmoivfrnvaqv --dry-run`, read the list, then run it
   without `--dry-run`. Check `npx supabase db advisors --remote=<ref> --type security`. (While staging
   is off, step 2 is the only rehearsal: CI also applies every migration to a fresh local database.)
4. Staging, when it's back in use: the same commands with `--remote=rtmtepejzkflhbmznbgo`.
5. Then push the code that uses it. Code that expects a table the database doesn't have breaks the site.

Read-only checks: `npx supabase db query --remote=<ref> --read-only "<sql>"`.

Auth settings and email templates live in `supabase/config.toml` (`[remotes.staging]`,
`[remotes.production]`): `npx supabase config diff --remote=<ref>`, then `config push`. Leaked-password
protection is a dashboard toggle (on in both).

## Manual steps (DJ)

Done: staging project, Auth settings and templates on both projects, leaked-password protection,
Sentry project and scrubbing. Production auth email through Resend on `reiq.app` (2026-11-19): SMTP in
`config.toml` under `[remotes.production.auth.email.smtp]`, key from `RESEND_API_KEY` in `.env.local` when
running `config push` (load it first: `set -a; . ./.env.local; set +a`), 100 emails an hour.

**Once there's a domain**
- Supabase production Auth: Site URL and Redirect URLs switch to exactly `https://<domain>/**` (in
  `config.toml`, then `config push`). Never a vercel.app pattern, localhost or broad wildcard in
  production; the `re-iq-*-dwoosty.vercel.app` wildcard is for staging only.
- Resend: add the domain, then its DNS records in Vercel exactly as shown (SPF TXT and MX on the `send`
  subdomain, DKIM TXT at `resend._domainkey`), plus DMARC at `_dmarc.<domain>`:
  `v=DMARC1; p=none; rua=mailto:<reports address>`, tightened to `p=quarantine` once reports show only
  Resend sending. Then Supabase → Authentication → SMTP settings → Resend, on both projects.
  Supabase's built-in email is rate-limited and not for production.
- Google OAuth client and Microsoft (Entra) app registration, each with the callback URL Supabase shows.
  Both need live Privacy and Terms URLs on the domain or Google shows an "unverified app" warning.

**Sentry**
- Org settings → Security & Privacy: "Data Scrubber" and "Prevent Storing of IP Addresses" for the org.
- Vercel Preview and Production: `SENTRY_DSN`, `SENTRY_ORG=re-iq`, `SENTRY_PROJECT=re-iq`, and an org
  auth token in `SENTRY_AUTH_TOKEN` (Vercel only). Without it, production stack traces stay minified.

## Backlog

- Confirmation required for every destructive action, with a POST, never a GET (in place for
  revoking invites, removing uploaders and archiving properties; keep it for anything new).
- Append-only `audit_log` wired into sign-in, sign-up, invites, uploads, exports, settings and
  mapping approvals.
- Delete originals 90 days after a customer cancels: `orgs.cancelled_at` exists (and blocks new
  uploads); the deletion job isn't built yet (TODO, once billing exists).
- Sweep `incoming` for files left behind by an interrupted upload (the server deletes them in the
  normal path; a scheduled cleanup through the Storage API is TODO).
- At parsing (next feature): payroll is stored as totals only, never per employee; resident names and
  bank account numbers are stripped from parsed data.
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

## Log

Newest first. Git history has the detail.

- **2026-11-19 (evening)**: properties and uploads migration applied to staging, then production (advisor
  checked on both); upload flow and `/docs/security` merged and pushed to `main`. Branches cleaned up;
  the old `testing` branch kept as tag `archive/testing-2026-11-02`. CI runs lint too.
- **2026-11-19**: production migrated (waitlist rows backed up, history repaired, 8 migrations); Auth as
  code pushed to both projects; staging created; legal pages; security headers and Sentry. PRs #2–#5.
- **2026-11-18**: live Supabase auth, orgs and roles, invites, RLS lock-down, private schema, demo
  isolation, rate limits, Vitest and CI. PR #1.
