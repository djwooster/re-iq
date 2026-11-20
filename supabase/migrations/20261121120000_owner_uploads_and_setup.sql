-- The real workspace (/app): owners and members upload reports themselves, setup is remembered per
-- org (so it follows the account to any computer), and owners can rename their org.

-- ---- Who may upload to a property ---------------------------------------------------------------
-- Before: only uploaders granted that property. Now also the org's owners and members.

create function private.can_write_property(target_property uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_property_access(target_property)
    or exists (select 1 from public.properties p where p.id = target_property and private.is_org_reader(p.org_id));
$$;

revoke execute on function private.can_write_property(uuid) from public, anon;
grant execute on function private.can_write_property(uuid) to authenticated;

-- Same checks as before (archived property, cancelled org, daily cap); only the access test changes.
-- record_upload calls this, so it follows.
create or replace function public.can_upload(target_property uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not private.can_write_property(target_property)
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

-- ---- Setup and org name -------------------------------------------------------------------------

alter table public.orgs add column setup_completed_at timestamptz;

-- Finishing or skipping setup. Owners and members; idempotent.
create function public.complete_setup(target_org uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.is_org_reader(target_org) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.orgs set setup_completed_at = coalesce(setup_completed_at, now()) where id = target_org;
end;
$$;

-- Owners only. Same length rule as sign-up (1 to 120 characters after trimming).
create function public.rename_org(target_org uuid, new_name text)
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
  if char_length(btrim(coalesce(new_name, ''))) not between 1 and 120 then
    raise exception 'invalid_name' using errcode = '23514';
  end if;
  update public.orgs set name = btrim(new_name) where id = target_org;
end;
$$;

revoke execute on function public.complete_setup(uuid), public.rename_org(uuid, text) from public, anon, service_role;
grant execute on function public.complete_setup(uuid), public.rename_org(uuid, text) to authenticated;
