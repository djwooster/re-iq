-- What RE-IQ read from each upload (lib/reading). The server writes it after the upload finishes
-- (service role); owners and members read it and confirm it. Nothing read counts toward the app's
-- numbers until someone confirms it (status 'confirmed').
--
-- result holds the layout Claude described and what the code took from the cells: figures for the
-- report's month, each line with its account and amount, aging totals, checks and notes. Amounts
-- only, never resident names (the reader takes totals, not resident rows).

create table public.report_reads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  upload_id uuid not null unique references public.uploads (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  status text not null check (status in ('reading', 'read', 'failed', 'confirmed')),
  report_type text,
  period date,
  model text,
  result jsonb,
  -- Accounts the reviewer changed, by row: {"12": "Utilities"}.
  overrides jsonb not null default '{}'::jsonb,
  error text check (error is null or char_length(error) <= 500),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users (id) on delete set null
);

create index report_reads_org_property_idx on public.report_reads (org_id, property_id);

alter table public.report_reads enable row level security;

create policy "readers read report reads" on public.report_reads
  for select to authenticated using (private.is_org_reader(org_id));

revoke all on public.report_reads from anon, authenticated;
grant select on public.report_reads to authenticated;

-- An owner or member confirms what was read, with any accounts they changed. Only a read that
-- finished ('read' or already 'confirmed', to change the accounts again) can be confirmed.
create function public.confirm_report_read(read_id uuid, account_overrides jsonb default '{}'::jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_org uuid;
begin
  select r.org_id into target_org from public.report_reads r where r.id = read_id and r.status in ('read', 'confirmed') for update;
  if target_org is null or (select auth.uid()) is null or not private.is_org_reader(target_org) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(account_overrides, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid_overrides' using errcode = '23514';
  end if;
  update public.report_reads
  set status = 'confirmed', overrides = coalesce(account_overrides, '{}'::jsonb), confirmed_at = now(), confirmed_by = (select auth.uid())
  where id = read_id;
end;
$$;

revoke execute on function public.confirm_report_read(uuid, jsonb) from public, anon, service_role;
grant execute on function public.confirm_report_read(uuid, jsonb) to authenticated;
