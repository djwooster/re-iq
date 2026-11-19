-- Lock down orgs, org_members and org_invites. Signed-in users may only SELECT their own org(s)
-- and their own membership rows; owners may also read their org's invites. Nobody writes these
-- tables directly: only security-definer functions do (handle_new_user on sign-up,
-- create_org_invite, accept_org_invite), each with search_path = ''.

drop policy "members read their org's memberships" on public.org_members;
create policy "users read their own memberships" on public.org_members
  for select to authenticated using (user_id = (select auth.uid()));

-- Belt and braces under RLS: no table-level write grants for API roles, and nothing for anon.
revoke insert, update, delete, truncate on public.orgs, public.org_members, public.org_invites from anon, authenticated;
revoke select on public.orgs, public.org_members, public.org_invites from anon;

-- The sign-up trigger function is only ever run by the trigger.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
