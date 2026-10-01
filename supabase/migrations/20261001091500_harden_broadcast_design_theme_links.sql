-- Harden Broadcast Design Studio authorization.
-- Custom designs may only link to system themes or themes owned by the same organization.

drop policy if exists broadcast_designs_insert on public.broadcast_designs;
create policy broadcast_designs_insert on public.broadcast_designs
for insert to authenticated
with check (
  (select private.is_platform_admin())
  or (
    design_type='CUSTOM'
    and organization_id is not null
    and created_by=(select auth.uid())
    and (select private.user_can_manage_org(organization_id))
    and (select private.theme_available_for_org(theme_id,organization_id))
  )
);

drop policy if exists broadcast_designs_update on public.broadcast_designs;
create policy broadcast_designs_update on public.broadcast_designs
for update to authenticated
using (
  (select private.is_platform_admin())
  or (design_type='CUSTOM' and (select private.user_can_manage_org(organization_id)))
)
with check (
  (select private.is_platform_admin())
  or (
    design_type='CUSTOM'
    and organization_id is not null
    and (select private.user_can_manage_org(organization_id))
    and (select private.theme_available_for_org(theme_id,organization_id))
  )
);
