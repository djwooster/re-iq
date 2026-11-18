-- Function lockdown. The API (PostgREST) exposes `public` and `graphql_public`. Only functions a
-- signed-in client is meant to call stay in `public`; everything internal, and everything that
-- bypasses RLS for the server, moves to `private`, which the API does not expose.
--
-- Client-callable (public, EXECUTE to authenticated only; each checks the caller itself):
--   create_org_invite, accept_org_invite (and revoke_org_invite, next migration)
-- Server-only entry point (public, EXECUTE to service_role only):
--   rate_limit_hit -> private.hit_rate_limit
-- Internal (private):
--   is_org_member, is_org_owner, is_org_reader  (RLS helpers; authenticated needs EXECUTE because
--     policies run as the querying user, but the API can't reach them)
--   handle_new_user (sign-up trigger), hit_rate_limit, table rate_limits

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

-- New functions in public get no EXECUTE by default; each migration grants what it needs.
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated, service_role;

-- RLS helpers and the trigger keep their identity (policies and the trigger follow the move).
alter function public.is_org_member(uuid) set schema private;
alter function public.is_org_owner(uuid) set schema private;
alter function public.is_org_reader(uuid) set schema private;
alter function public.handle_new_user() set schema private;

revoke execute on function private.is_org_member(uuid), private.is_org_owner(uuid), private.is_org_reader(uuid) from public, anon;
grant execute on function private.is_org_member(uuid), private.is_org_owner(uuid), private.is_org_reader(uuid) to authenticated;
revoke execute on function private.handle_new_user() from public, anon, authenticated, service_role;

-- create_org_invite resolved is_org_owner by name, so it's recreated against the new schema.
create or replace function public.create_org_invite(target_org uuid, invite_email text, invite_role text default 'uploader')
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  raw_token text;
begin
  if (select auth.uid()) is null or not private.is_org_owner(target_org) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.org_invites (org_id, email, role, token_hash, invited_by)
  values (target_org, lower(trim(invite_email)), invite_role, encode(sha256(convert_to(raw_token, 'UTF8')), 'hex'), (select auth.uid()));
  return raw_token;
end;
$$;

revoke execute on function public.create_org_invite(uuid, text, text), public.accept_org_invite(text) from public, anon, service_role;
grant execute on function public.create_org_invite(uuid, text, text), public.accept_org_invite(text) to authenticated;

-- Rate limiting: table and counter move to private; the server reaches them through one entry
-- point that only the service role may execute. Pre-launch rows are dropped.
alter table public.rate_limits set schema private;
truncate private.rate_limits;
revoke all on private.rate_limits from public, anon, authenticated;

drop function public.hit_rate_limit(text, integer, integer);

create function private.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  insert into private.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits <= p_limit;
$$;

revoke execute on function private.hit_rate_limit(text, integer, integer) from public, anon, authenticated, service_role;

create function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  select private.hit_rate_limit(p_key, p_limit, p_window_seconds);
$$;

revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
