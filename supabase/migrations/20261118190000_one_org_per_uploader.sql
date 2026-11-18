-- Uploaders belong to exactly one org, and an account is either an uploader or an owner/member,
-- never both. Enforced on org_members itself, so it holds for every writer (functions, service
-- role, future code), and checked up front when an owner creates an invite.

create unique index org_members_one_org_per_uploader on public.org_members (user_id) where role = 'uploader';

create function private.enforce_membership_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serialize membership changes per user, so two concurrent inserts can't both pass the check.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if new.role = 'uploader' and exists (
    select 1 from public.org_members m
    where m.user_id = new.user_id and m.org_id <> new.org_id
  ) then
    raise exception 'uploader_single_org' using errcode = '23514';
  end if;
  if new.role in ('owner', 'member') and exists (
    select 1 from public.org_members m
    where m.user_id = new.user_id and m.org_id <> new.org_id and m.role = 'uploader'
  ) then
    raise exception 'uploader_single_org' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function private.enforce_membership_rules() from public, anon, authenticated, service_role;

create trigger org_members_enforce_rules
  before insert or update of role, user_id, org_id on public.org_members
  for each row execute function private.enforce_membership_rules();

-- Refuse invites that could never be accepted: an existing owner/member invited as uploader, or
-- an existing uploader invited anywhere else.
create or replace function public.create_org_invite(target_org uuid, invite_email text, invite_role text default 'uploader')
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
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.org_invites (org_id, email, role, token_hash, invited_by)
  values (target_org, normalized, invite_role, encode(sha256(convert_to(raw_token, 'UTF8')), 'hex'), (select auth.uid()));
  return raw_token;
end;
$$;

revoke execute on function public.create_org_invite(uuid, text, text) from public, anon, service_role;
grant execute on function public.create_org_invite(uuid, text, text) to authenticated;
