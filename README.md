# RE-IQ

## Run it locally
Needs Node 22 and OrbStack (or Docker).

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in (production values, from the Supabase,
   Anthropic, Resend and Sentry dashboards).
3. `npm run dev`, then open http://localhost:3000.

## Database
- Local: `npx supabase start` applies every migration in `supabase/migrations`.
  `npx supabase db reset` re-applies them from scratch.
- New migration: `npx supabase migration new <name>`, write the SQL, try it locally.
- Production: `npx supabase db push --remote=dixlcrxxnmoivfrnvaqv --dry-run`, read the list,
  then run it without `--dry-run`. Then
  `npx supabase db advisors --remote=dixlcrxxnmoivfrnvaqv --type security`.
- Auth settings and email templates live in `supabase/config.toml`:
  `npx supabase config diff --remote=dixlcrxxnmoivfrnvaqv`, then `config push`
  (load `RESEND_API_KEY` first: `set -a; . ./.env.local; set +a`).

## Tests
With local Supabase running, put the keys from `npx supabase status -o env` into `.env.local`
as `TEST_SUPABASE_URL`, `TEST_SUPABASE_PUBLISHABLE_KEY` and `TEST_SUPABASE_SECRET_KEY`, then
`npm test`. CI runs the same suite on every push.

## Deploy
Pushing `main` deploys to production on Vercel (https://re-iq.vercel.app).
