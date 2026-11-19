-- Fixed-window rate limits for auth (sign-in, sign-up, password reset, invite acceptance).
-- Keys look like "signIn:ip:<sha256 of the IP>" or "signIn:id:<sha256 of the email>", so no raw IPs or emails are
-- stored. Only the server (service role) calls hit_rate_limit; API roles can't touch the table.

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Counts one hit and returns whether the caller is still within the limit for this window.
create function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits <= p_limit;
$$;

revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
