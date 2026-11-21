-- Management companies: who runs each property and the email its monthly reports come from. Set in
-- setup's Managers step. Each property belongs to at most one company. Owners and members read;
-- owners write.

create table public.management_companies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  reports_email text check (reports_email is null or (char_length(reports_email) <= 254 and reports_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index management_companies_org_id_idx on public.management_companies (org_id);

alter table public.management_companies enable row level security;

create policy "readers read management companies" on public.management_companies
  for select to authenticated using (private.is_org_reader(org_id));
create policy "owners create management companies" on public.management_companies
  for insert to authenticated with check (private.is_org_owner(org_id));
create policy "owners edit management companies" on public.management_companies
  for update to authenticated using (private.is_org_owner(org_id)) with check (private.is_org_owner(org_id));
create policy "owners remove management companies" on public.management_companies
  for delete to authenticated using (private.is_org_owner(org_id));

revoke all on public.management_companies from anon, authenticated;
grant select, delete on public.management_companies to authenticated;
grant insert (org_id, name, reports_email) on public.management_companies to authenticated;
grant update (name, reports_email) on public.management_companies to authenticated;

-- Which company manages each property. Owners set it (the existing "owners edit properties" policy).
alter table public.properties add column management_company_id uuid references public.management_companies (id) on delete set null;
create index properties_management_company_id_idx on public.properties (management_company_id);
grant update (management_company_id) on public.properties to authenticated;

-- A property can only belong to a company of its own org.
create function private.check_property_company()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.management_company_id is not null and not exists (
    select 1 from public.management_companies c where c.id = new.management_company_id and c.org_id = new.org_id
  ) then
    raise exception 'company_not_in_org' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function private.check_property_company() from public, anon, authenticated, service_role;

create trigger properties_check_company
  before insert or update of management_company_id, org_id on public.properties
  for each row execute function private.check_property_company();
