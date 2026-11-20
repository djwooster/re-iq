-- Thresholds and targets (Settings → Thresholds and targets): one target per KPI, for all of an org's
-- properties (property_id null) or for one property. Owners and members read; owners write.

create table public.org_thresholds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  property_id uuid references public.properties (id) on delete cascade,
  kpi text not null check (char_length(kpi) between 1 and 80),
  target text not null check (char_length(btrim(target)) between 1 and 200),
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create unique index org_thresholds_scope_kpi on public.org_thresholds (org_id, coalesce(property_id, '00000000-0000-0000-0000-000000000000'::uuid), kpi);

alter table public.org_thresholds enable row level security;

create policy "readers read thresholds" on public.org_thresholds
  for select to authenticated using (private.is_org_reader(org_id));
-- A property-level target must name a property in the same org.
create policy "owners create thresholds" on public.org_thresholds
  for insert to authenticated with check (
    private.is_org_owner(org_id)
    and (property_id is null or exists (select 1 from public.properties p where p.id = property_id and p.org_id = org_thresholds.org_id))
  );
create policy "owners edit thresholds" on public.org_thresholds
  for update to authenticated using (private.is_org_owner(org_id)) with check (private.is_org_owner(org_id));
create policy "owners remove thresholds" on public.org_thresholds
  for delete to authenticated using (private.is_org_owner(org_id));

revoke all on public.org_thresholds from anon, authenticated;
grant select, delete on public.org_thresholds to authenticated;
grant insert (org_id, property_id, kpi, target) on public.org_thresholds to authenticated;
grant update (target, updated_at) on public.org_thresholds to authenticated;
