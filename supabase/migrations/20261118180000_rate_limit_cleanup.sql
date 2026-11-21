-- Hourly cleanup of rate-limit rows older than 24 hours (the longest window is one hour).
-- pg_cron is available on every Supabase plan, including free, and in local `supabase start`.
-- This migration enables it (Supabase's documented SQL route); no dashboard step is needed.
-- Without pg_cron, run the delete below from a scheduled job instead.

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'purge-rate-limits',
  '7 * * * *',
  $$delete from private.rate_limits where window_start < now() - interval '24 hours'$$
);
