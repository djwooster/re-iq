-- A property manager can upload for several owners with one account, and switches between them in
-- the app. What still holds: an account is either an uploader or an owner/member, never both.
-- Replaces the one-org rule from 20261118190000_one_org_per_uploader.sql.

drop index public.org_members_one_org_per_uploader;

create or replace function private.enforce_membership_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serialize membership changes per user, so two concurrent inserts can't both pass the check.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if exists (
    select 1 from public.org_members m
    where m.user_id = new.user_id
      and m.org_id <> new.org_id
      and (m.role = 'uploader') <> (new.role = 'uploader')
  ) then
    raise exception 'uploader_role_conflict' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Refuse invites that could never be accepted: an existing owner/member invited as an uploader, or
-- an existing uploader invited as an owner/member. An uploader invited by another owner is fine.
create or replace function public.create_org_invite(target_org uuid, invite_email text, invite_role text default 'uploader', property_ids uuid[] default '{}')
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
      and (m.role = 'uploader') <> (invite_role = 'uploader')
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
