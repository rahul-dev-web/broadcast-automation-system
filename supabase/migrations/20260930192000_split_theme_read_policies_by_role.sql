-- Split theme read policies so anonymous browser-source clients do not need
-- organization-membership helper execution privileges.
drop policy if exists broadcast_themes_read on public.broadcast_themes;

create policy broadcast_themes_anon_read on public.broadcast_themes
for select to anon
using (
  theme_type='SYSTEM'
  or (theme_type='CUSTOM' and exists (
    select 1 from public.tournaments t
    where t.theme_id=broadcast_themes.id
      and (select private.public_broadcast_access(t.id))
  ))
);

create policy broadcast_themes_authenticated_read on public.broadcast_themes
for select to authenticated
using (
  theme_type='SYSTEM'
  or (select private.is_platform_admin())
  or (organization_id is not null and
      (select private.user_has_org_role(organization_id,array['OWNER','OPERATOR','VIEWER']::text[])))
  or (theme_type='CUSTOM' and exists (
      select 1 from public.tournaments t
      where t.theme_id=broadcast_themes.id
        and (select private.public_broadcast_access(t.id))
  ))
);

revoke execute on function private.is_platform_admin() from anon;
revoke execute on function private.theme_available_for_org(uuid,uuid) from public;
grant execute on function private.theme_available_for_org(uuid,uuid) to authenticated;
