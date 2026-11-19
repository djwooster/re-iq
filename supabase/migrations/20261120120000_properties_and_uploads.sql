-- Properties, uploader access per property, upload records, and the two private storage buckets.
--
-- Flow: the server checks access (can_upload), the browser uploads into the private "incoming"
-- bucket with a one-time signed URL, the server validates the file contents, strips photo metadata,
-- copies it into the private "reports" bucket and records it (record_upload). Clients can't write to
-- either bucket and can't read "incoming"; reading "reports" follows the org and property grants.

-- Cancellation: originals are deleted 90 days after this (deletion job: TODO, see SECURITY.md).
alter table public.orgs add column cancelled_at timestamptz;

-- ---- Properties -------------------------------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  address text check (address is null or char_length(address) <= 300),
  unit_count integer check (unit_count is null or unit_count between 0 and 100000),
  archived_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index properties_org_id_idx on public.properties (org_id);

-- ---- Uploader access per property ---------------------------------------------------------------

create table public.uploader_property_access (
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create index uploader_property_access_org_idx on public.uploader_property_access (org_id);
create index uploader_property_access_property_idx on public.uploader_property_access (property_id);

-- Invites carry the properties the uploader will get on acceptance.
alter table public.org_invites add column property_ids uuid[] not null default '{}';

-- ---- Uploads ------------------------------------------------------------------------------------

create table public.uploads (
  id uuid primary key,
  org_id uuid not null references public.orgs (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  uploaded_by uuid references auth.users (id) on delete set null,
  report_type text not null check (report_type ~ '^[a-z0-9_]{1,40}$'),
  period date not null check (extract(day from period) = 1),
  file_name text not null check (char_length(file_name) between 1 and 200),
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  content_type text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text not null unique,
  version integer not null check (version >= 1),
  status text not null default 'received' check (status in ('received')),
  created_at timestamptz not null default now(),
  unique (property_id, report_type, period, file_name, version)
);

create index uploads_org_created_idx on public.uploads (org_id, created_at desc);
create index uploads_property_period_idx on public.uploads (property_id, period desc);
create index uploads_uploaded_by_idx on public.uploads (uploaded_by);

-- ---- Access helpers (private: not reachable through the API) -------------------------------------

-- The caller is an uploader of this property's org with a grant to it.
create function private.has_property_access(target_property uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.uploader_property_access a
    join public.org_members m on m.org_id = a.org_id and m.user_id = a.user_id and m.role = 'uploader'
    where a.property_id = target_property and a.user_id = (select auth.uid())
  );
$$;

-- Storage paths are {org_id}/{property_id}/{upload_id}/{file}; text that isn't a uuid reads as null.
create function private.try_uuid(value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return value::uuid;
exception when others then
  return null;
end;
$$;

-- May the caller read this object in the "reports" bucket? Owners and members of its org, or the
-- uploader who uploaded it while they still have access to its property.
create function private.can_read_report_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_org_reader(private.try_uuid(split_part(object_name, '/', 1)))
    or exists (
      select 1 from public.uploads u
      where u.storage_path = object_name
        and u.uploaded_by = (select auth.uid())
        and private.has_property_access(u.property_id)
    );
$$;

revoke execute on function private.has_property_access(uuid), private.can_read_report_object(text) from public, anon;
grant execute on function private.has_property_access(uuid), private.can_read_report_object(text) to authenticated;
revoke execute on function private.try_uuid(text) from public, anon;
grant execute on function private.try_uuid(text) to authenticated;

-- ---- Row-level security -------------------------------------------------------------------------

alter table public.properties enable row level security;
alter table public.uploader_property_access enable row level security;
alter table public.uploads enable row level security;

-- Properties: owners and members read their org's; uploaders read the ones they're granted.
-- Owners create, edit and archive (no deletes). Columns that may change are limited by grants.
create policy "readers and granted uploaders read properties" on public.properties
  for select to authenticated using (private.is_org_reader(org_id) or private.has_property_access(id));
create policy "owners create properties" on public.properties
  for insert to authenticated with check (private.is_org_owner(org_id));
create policy "owners edit properties" on public.properties
  for update to authenticated using (private.is_org_owner(org_id)) with check (private.is_org_owner(org_id));

revoke all on public.properties from anon, authenticated;
grant select on public.properties to authenticated;
grant insert (org_id, name, address, unit_count) on public.properties to authenticated;
grant update (name, address, unit_count, archived_at) on public.properties to authenticated;

-- Access grants: owners and members see their org's; uploaders see their own. Writes go through
-- set_uploader_access / remove_uploader / accept_org_invite only.
create policy "readers and the uploader read access grants" on public.uploader_property_access
  for select to authenticated using (private.is_org_reader(org_id) or user_id = (select auth.uid()));
revoke all on public.uploader_property_access from anon, authenticated;
grant select on public.uploader_property_access to authenticated;

-- Uploads: owners and members see all of their org's; an uploader sees only their own, and only
-- while they still have access to the property. Writes go through record_upload only.
create policy "readers see org uploads, uploaders their own" on public.uploads
  for select to authenticated using (
    private.is_org_reader(org_id)
    or (uploaded_by = (select auth.uid()) and private.has_property_access(property_id))
  );
revoke all on public.uploads from anon, authenticated;
grant select on public.uploads to authenticated;

-- ---- Functions the app calls (public, authenticated only; each checks the caller) ---------------

-- Invites now carry property grants. Replaces the 3-argument version.
drop function public.create_org_invite(uuid, text, text);

create function public.create_org_invite(target_org uuid, invite_email text, invite_role text default 'uploader', property_ids uuid[] default '{}')
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  raw_token text;
  normalized text := lower(btrim(invite_email));
begin
  if (select auth.uid()) is null or not private.is_org_owner(target_org) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if exists (
    select 1 from auth.users u join public.org_members m on m.user_id = u.id
    where lower(btrim(u.email)) = normalized
      and m.org_id <> target_org
      and (invite_role = 'uploader' or m.role = 'uploader')
  ) then
    raise exception 'invite_conflict' using errcode = '23514';
  end if;
  if exists (
    select 1 from unnest(coalesce(property_ids, '{}')) as p(id)
    where not exists (select 1 from public.properties x where x.id = p.id and x.org_id = target_org and x.archived_at is null)
  ) then
    raise exception 'invalid_property' using errcode = '23514';
  end if;
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.org_invites (org_id, email, role, token_hash, invited_by, property_ids)
  values (target_org, normalized, invite_role, encode(sha256(convert_to(raw_token, 'UTF8')), 'hex'), (select auth.uid()),
          case when invite_role = 'uploader' then coalesce(property_ids, '{}') else '{}' end);
  return raw_token;
end;
$$;

-- Acceptance also grants the invite's properties (those still in the org and not archived).
create or replace function public.accept_org_invite(raw_token text)
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
  select lower(btrim(u.email)) into my_email from auth.users u where u.id = me and u.email_confirmed_at is not null;
  if my_email is null then
    raise exception 'invite_invalid' using errcode = '42501';
  end if;
  select * into invite from public.org_invites i
  where i.token_hash = encode(sha256(convert_to(raw_token, 'UTF8')), 'hex')
    and i.accepted_at is null and i.revoked_at is null and i.expires_at > now() and i.email = my_email
  for update;
  if not found then
    raise exception 'invite_invalid' using errcode = '42501';
  end if;
  insert into public.org_members (org_id, user_id, role) values (invite.org_id, me, invite.role)
  on conflict (org_id, user_id) do nothing;
  if invite.role = 'uploader' then
    insert into public.uploader_property_access (org_id, user_id, property_id, granted_by)
    select invite.org_id, me, p.id, invite.invited_by
    from public.properties p
    where p.id = any (invite.property_ids) and p.org_id = invite.org_id and p.archived_at is null
    on conflict do nothing;
  end if;
  update public.org_invites set accepted_at = now() where id = invite.id;
  return invite.org_id;
end;
$$;

-- An owner sets exactly which properties an uploader of their org may upload to. Takes effect at once.
create function public.set_uploader_access(target_org uuid, target_user uuid, property_ids uuid[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.is_org_owner(target_org) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.org_members m where m.org_id = target_org and m.user_id = target_user and m.role = 'uploader') then
    raise exception 'not_an_uploader' using errcode = '23514';
  end if;
  if exists (
    select 1 from unnest(coalesce(property_ids, '{}')) as p(id)
    where not exists (select 1 from public.properties x where x.id = p.id and x.org_id = target_org and x.archived_at is null)
  ) then
    raise exception 'invalid_property' using errcode = '23514';
  end if;
  delete from public.uploader_property_access a
  where a.org_id = target_org and a.user_id = target_user and not (a.property_id = any (coalesce(property_ids, '{}')));
  insert into public.uploader_property_access (org_id, user_id, property_id, granted_by)
  select target_org, target_user, p.id, (select auth.uid()) from unnest(coalesce(property_ids, '{}')) as p(id)
  on conflict do nothing;
end;
$$;

-- An owner removes an uploader from their org: all property grants and the membership.
create function public.remove_uploader(target_org uuid, target_user uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.is_org_owner(target_org) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  delete from public.uploader_property_access where org_id = target_org and user_id = target_user;
  delete from public.org_members where org_id = target_org and user_id = target_user and role = 'uploader';
end;
$$;

-- Owners and members see who is in their org (for "uploaded by" and the uploaders list).
create function public.org_people(target_org uuid)
returns table (user_id uuid, email text, full_name text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, u.email::text, nullif(u.raw_user_meta_data ->> 'full_name', ''), m.role
  from public.org_members m join auth.users u on u.id = m.user_id
  where m.org_id = target_org and private.is_org_reader(target_org);
$$;

-- Uploads per org per rolling 24 hours.
create function private.org_upload_cap()
returns integer
language sql
immutable
set search_path = ''
as $$ select 500 $$;

-- May the caller upload to this property right now? 'ok', 'no_access' or 'org_cap'.
create function public.can_upload(target_property uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not private.has_property_access(target_property)
      or not exists (select 1 from public.properties p where p.id = target_property and p.archived_at is null)
      or exists (select 1 from public.properties p join public.orgs o on o.id = p.org_id where p.id = target_property and o.cancelled_at is not null)
      then 'no_access'
    when (
      select count(*) from public.uploads u join public.properties p on p.org_id = u.org_id
      where p.id = target_property and u.created_at > now() - interval '24 hours'
    ) >= private.org_upload_cap() then 'org_cap'
    else 'ok'
  end;
$$;

-- Records a validated file the server has already written to the "reports" bucket. Re-checks access
-- and the daily cap, requires the object to exist at the expected path, and numbers versions:
-- the same file name for the same property, report type and period becomes the next version.
create function public.record_upload(
  upload_id uuid, target_property uuid, report_type text, period date, file_name text,
  size_bytes bigint, content_type text, sha256 text
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  target_org uuid;
  path text;
  next_version integer;
begin
  if me is null or public.can_upload(target_property) <> 'ok' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select p.org_id into target_org from public.properties p where p.id = target_property;
  path := target_org::text || '/' || target_property::text || '/' || upload_id::text || '/' || file_name;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'reports' and o.name = path) then
    raise exception 'object_missing' using errcode = '23514';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_property::text, 0));
  select coalesce(max(u.version), 0) + 1 into next_version from public.uploads u
  where u.property_id = target_property and u.report_type = record_upload.report_type
    and u.period = record_upload.period and lower(u.file_name) = lower(record_upload.file_name);
  insert into public.uploads (id, org_id, property_id, uploaded_by, report_type, period, file_name, size_bytes, content_type, sha256, storage_path, version)
  values (upload_id, target_org, target_property, me, report_type, period, file_name, size_bytes, content_type, sha256, path, next_version);
  return next_version;
end;
$$;

revoke execute on function
  public.create_org_invite(uuid, text, text, uuid[]), public.accept_org_invite(text),
  public.set_uploader_access(uuid, uuid, uuid[]), public.remove_uploader(uuid, uuid),
  public.org_people(uuid), public.can_upload(uuid),
  public.record_upload(uuid, uuid, text, date, text, bigint, text, text)
from public, anon, service_role;
grant execute on function
  public.create_org_invite(uuid, text, text, uuid[]), public.accept_org_invite(text),
  public.set_uploader_access(uuid, uuid, uuid[]), public.remove_uploader(uuid, uuid),
  public.org_people(uuid), public.can_upload(uuid),
  public.record_upload(uuid, uuid, text, date, text, bigint, text, text)
to authenticated;
revoke execute on function private.org_upload_cap() from public, anon;
grant execute on function private.org_upload_cap() to authenticated;

-- ---- Storage ------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('reports', 'reports', false, 26214400), ('incoming', 'incoming', false, 26214400)
on conflict (id) do nothing;

-- Reading "reports" follows the org and property grants. There are no insert, update or delete
-- policies on either bucket: only the server (service role) writes, after validating the file.
-- "incoming" has no policies at all, so no client can read or list it.
create policy "reports: readers and the uploading uploader read" on storage.objects
  for select to authenticated using (bucket_id = 'reports' and private.can_read_report_object(name));
