-- Remove the legacy broadcast theme layer.
-- Broadcast Design Packs are now the single visual source for typography,
-- layout, motion, colors and broadcast assets.

drop policy if exists broadcast_themes_read on public.broadcast_themes;
drop policy if exists broadcast_themes_anon_read on public.broadcast_themes;
drop policy if exists broadcast_themes_authenticated_read on public.broadcast_themes;
drop policy if exists broadcast_themes_insert on public.broadcast_themes;
drop policy if exists broadcast_themes_update on public.broadcast_themes;
drop policy if exists broadcast_themes_delete on public.broadcast_themes;

drop policy if exists broadcast_designs_read on public.broadcast_designs;
drop policy if exists broadcast_designs_anon_read on public.broadcast_designs;
drop policy if exists broadcast_designs_authenticated_read on public.broadcast_designs;
drop policy if exists broadcast_designs_insert on public.broadcast_designs;
drop policy if exists broadcast_designs_update on public.broadcast_designs;
drop policy if exists broadcast_designs_delete on public.broadcast_designs;

drop policy if exists broadcast_design_assets_read on public.broadcast_design_assets;
drop policy if exists broadcast_design_assets_anon_read on public.broadcast_design_assets;
drop policy if exists broadcast_design_assets_authenticated_read on public.broadcast_design_assets;

drop policy if exists tournaments_manage_insert on public.tournaments;
drop policy if exists tournaments_manage_update on public.tournaments;

alter table public.broadcast_designs drop column if exists theme_id;
alter table public.tournaments drop column if exists theme_id;

create policy broadcast_designs_anon_read
on public.broadcast_designs
for select to anon
using (
  design_type = 'SYSTEM'
  or (
    design_type = 'CUSTOM'
    and exists (
      select 1 from public.tournaments t
      where t.design_id = broadcast_designs.id
        and (select private.public_broadcast_access(t.id))
    )
  )
);

create policy broadcast_designs_authenticated_read
on public.broadcast_designs
for select to authenticated
using (
  design_type = 'SYSTEM'
  or (select private.is_platform_admin())
  or (
    organization_id is not null
    and (select private.user_has_org_role(
      organization_id, array['OWNER','OPERATOR','VIEWER']::text[]
    ))
  )
);

create policy broadcast_designs_insert on public.broadcast_designs
for insert to authenticated
with check (
  (select private.is_platform_admin())
  or (
    design_type = 'CUSTOM'
    and organization_id is not null
    and created_by = (select auth.uid())
    and (select private.user_can_manage_org(organization_id))
  )
);

create policy broadcast_designs_update on public.broadcast_designs
for update to authenticated
using (
  (select private.is_platform_admin())
  or (design_type = 'CUSTOM' and (select private.user_can_manage_org(organization_id)))
)
with check (
  (select private.is_platform_admin())
  or (
    design_type = 'CUSTOM'
    and organization_id is not null
    and (select private.user_can_manage_org(organization_id))
  )
);

create policy broadcast_designs_delete on public.broadcast_designs
for delete to authenticated
using (
  (select private.is_platform_admin())
  or (design_type = 'CUSTOM' and (select private.user_can_manage_org(organization_id)))
);

create policy broadcast_design_assets_anon_read
on public.broadcast_design_assets
for select to anon
using (
  exists (
    select 1 from public.tournaments t
    where t.design_id = broadcast_design_assets.design_id
      and (select private.public_broadcast_access(t.id))
  )
);

create policy broadcast_design_assets_authenticated_read
on public.broadcast_design_assets
for select to authenticated
using (
  (select private.is_platform_admin())
  or (select private.user_has_org_role(
    organization_id, array['OWNER','OPERATOR','VIEWER']::text[]
  ))
);

create policy tournaments_manage_insert on public.tournaments
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and quota_exempt = false
  and (select private.user_can_create_tournament(organization_id))
  and (select private.design_available_for_org(design_id, organization_id))
);

create policy tournaments_manage_update on public.tournaments
for update to authenticated
using ((select private.user_can_manage_tournament(id)))
with check (
  (select private.user_can_manage_tournament(id))
  and quota_exempt = false
  and (select private.design_available_for_org(design_id, organization_id))
);

drop function if exists private.theme_available_for_org(uuid, uuid);
drop table if exists public.broadcast_themes;
