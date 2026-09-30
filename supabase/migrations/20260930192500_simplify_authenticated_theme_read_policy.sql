drop policy if exists broadcast_themes_authenticated_read on public.broadcast_themes;

create policy broadcast_themes_authenticated_read
on public.broadcast_themes
for select
to authenticated
using (
  theme_type='SYSTEM'
  or (select private.is_platform_admin())
  or (
    organization_id is not null
    and (select private.user_has_org_role(
      organization_id,
      array['OWNER','OPERATOR','VIEWER']::text[]
    ))
  )
);
