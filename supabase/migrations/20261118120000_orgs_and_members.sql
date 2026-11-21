-- Organizations and their members. Every customer-data table added later carries org_id and
-- copies the policy pattern below: rows are visible only to members of that org.
-- Try it on local Supabase first, never straight to production.

create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index org_members_user_id_idx on public.org_members (user_id);

alter table public.orgs enable row level security;
alter table public.org_members enable row level security;

-- Is the signed-in user a member of this org? Security definer so policies on org_members
-- can call it without recursing into their own RLS.
create function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = target_org and m.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;

-- Read-only for members. Creating orgs and adding members happens on the server
-- (the sign-up trigger below now; an invite flow later), so there are no write policies.
create policy "members read their orgs" on public.orgs
  for select to authenticated using (public.is_org_member(id));

create policy "members read their org's memberships" on public.org_members
  for select to authenticated using (public.is_org_member(org_id));

-- Every new user gets their own org, named from the sign-up form's company field. Google and
-- Microsoft sign-ups have no company, so they fall back to the person's name or email domain.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org uuid;
  org_name text;
begin
  org_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'company'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), '') || '''s workspace',
    split_part(new.email, '@', 2),
    'My workspace'
  );
  insert into public.orgs (name) values (left(org_name, 120)) returning id into new_org;
  insert into public.org_members (org_id, user_id, role) values (new_org, new.id, 'owner');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
