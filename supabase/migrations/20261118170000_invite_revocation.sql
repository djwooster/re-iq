-- Invites: stored emails normalized (lowercase, trimmed), owners can revoke pending invites, and
-- acceptance requires a pending, unexpired, unrevoked invite for the caller's confirmed email.

alter table public.org_invites drop constraint org_invites_email_check;
update public.org_invites set email = lower(btrim(email));
alter table public.org_invites add constraint org_invites_email_check check (email = lower(btrim(email)) and char_length(email) between 3 and 254);
alter table public.org_invites add column revoked_at timestamptz;

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
  update public.org_invites set accepted_at = now() where id = invite.id;
  return invite.org_id;
end;
$$;

-- An owner revokes a pending invite of their org. Returns false if there was nothing to revoke.
create function public.revoke_org_invite(invite_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_org uuid;
begin
  select i.org_id into target_org from public.org_invites i where i.id = invite_id;
  if (select auth.uid()) is null or target_org is null or not private.is_org_owner(target_org) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.org_invites set revoked_at = now()
  where id = invite_id and accepted_at is null and revoked_at is null;
  return found;
end;
$$;

revoke execute on function public.accept_org_invite(text), public.revoke_org_invite(uuid) from public, anon, service_role;
grant execute on function public.accept_org_invite(text), public.revoke_org_invite(uuid) to authenticated;
