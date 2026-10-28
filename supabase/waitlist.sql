-- Early-access signups from the marketing site. Run once in the Supabase SQL editor.
-- The site writes with the secret key, which bypasses RLS; with RLS on and no
-- policies, the public (anon/publishable) key can't read or write this table.
create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  source text not null,
  submitted_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
