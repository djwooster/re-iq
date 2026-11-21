-- Roles: owner, member, uploader. Owners and members use the dashboards; uploaders are property
-- managers who only send reports. Uploaders never create an org: they join one by invitation.
-- Run after 20261118120000_orgs_and_members.sql, on local Supabase first.

alter table public.org_members drop constraint org_members_role_check;
update public.org_members set role = 'member' where role = 'admin';
alter table public.org_members add constraint org_members_role_check check (role in ('owner', 'member', 'uploader'));

-- Owner of this org?
create function public.is_org_owner(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = target_org and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;

-- May read this org's dashboard data (owners and members, never uploaders)? Policies on
-- customer-data tables use this, so uploader access is refused in the database, not just the UI.
create function public.is_org_reader(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = target_org and m.user_id = (select auth.uid()) and m.role in ('owner', 'member')
  );
$$;

revoke execute on function public.is_org_owner(uuid), public.is_org_reader(uuid) from public, anon;
grant execute on function public.is_org_owner(uuid), public.is_org_reader(uuid) to authenticated;

-- Invitations. Only a SHA-256 hash of the token is stored; the token itself goes out in the
-- invite link once and is never kept.
create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) <= 254),
  role text not null default 'uploader' check (role in ('member', 'uploader')),
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index org_invites_org_id_idx on public.org_invites (org_id);

alter table public.org_invites enable row level security;

create policy "owners read their org's invites" on public.org_invites
  for select to authenticated using (public.is_org_owner(org_id));

-- An owner invites someone; returns the raw token for the invite link (shown once, never stored).
create function public.create_org_invite(target_org uuid, invite_email text, invite_role text default 'uploader')
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  raw_token text;
begin
  if not public.is_org_owner(target_org) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.org_invites (org_id, email, role, token_hash, invited_by)
  values (target_org, lower(trim(invite_email)), invite_role, encode(sha256(convert_to(raw_token, 'UTF8')), 'hex'), (select auth.uid()));
  return raw_token;
end;
$$;

-- The signed-in user accepts an invite sent to their (confirmed) email address. Adds them to that
-- org with the invite's role and creates no org. Returns the org ID.
create function public.accept_org_invite(raw_token text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  my_email text;
  invite public.org_invites%rowtype;
begin
  select lower(u.email) into my_email from auth.users u where u.id = me and u.email_confirmed_at is not null;
  if my_email is null then
    raise exception 'invite_invalid' using errcode = '42501';
  end if;
  select * into invite from public.org_invites i
  where i.token_hash = encode(sha256(convert_to(raw_token, 'UTF8')), 'hex')
    and i.accepted_at is null and i.expires_at > now() and i.email = my_email
  for update;
  if not found then
    raise exception 'invite_invalid' using errcode = '42501';
  end if;
  insert into public.org_members (org_id, user_id, role) values (invite.org_id, me, invite.role)
  on conflict (org_id, user_id) do nothing;
  update public.org_invites set accepted_at = now() where id = invite.id;
  return invite.org_id;
end;
$$;

revoke execute on function public.create_org_invite(uuid, text, text), public.accept_org_invite(text) from public, anon;
grant execute on function public.create_org_invite(uuid, text, text), public.accept_org_invite(text) to authenticated;

-- Self sign-up still creates an org with its owner. Sign-ups from an invite link carry
-- signup_via = 'invite' and get no org; accept_org_invite adds them to the inviting org.
-- (A person who sets that flag themselves just ends up with no org, so it grants nothing.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org uuid;
  org_name text;
begin
  if new.raw_user_meta_data ->> 'signup_via' = 'invite' then
    return new;
  end if;
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
