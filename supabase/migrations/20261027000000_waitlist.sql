-- Early-access signups from the marketing site. Already live on production (created by hand on
-- 2026-10-27); idempotent, and marked as applied there with `supabase migration repair`.
-- The site writes with the secret key, which bypasses RLS; with RLS on and no
-- policies, the public (anon/publishable) key can't read or write this table.
create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  source text not null,
  submitted_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
