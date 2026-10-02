-- Custom Broadcast Design Studio is a Pro-only entitlement.
-- System Design Packs remain available to Starter and Pro.
-- This migration also removes the previous broad tournament design-assignment
-- exception that could bypass the normal active-subscription tournament update
-- policy.

create or replace function private.user_has_active_pro_membership(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    join public.subscription_plans p on p.id = s.plan_id
    where om.organization_id = p_organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('OWNER','OPERATOR','VIEWER')
      and s.status = 'ACTIVE'
      and s.expires_at > now()
      and p.id = 'PRO'
      and p.enabled = true
  ) or (select private.is_platform_admin());
$function$;

grant execute on function private.user_has_active_pro_membership(uuid) to authenticated;

create or replace function private.user_can_manage_custom_design(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    join public.subscription_plans p on p.id = s.plan_id
    where om.organization_id = p_organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('OWNER','OPERATOR')
      and s.status = 'ACTIVE'
      and s.expires_at > now()
      and p.id = 'PRO'
      and p.enabled = true
  ) or (select private.is_platform_admin());
$function$;

grant execute on function private.user_can_manage_custom_design(uuid) to authenticated;

create or replace function private.design_available_for_org(p_design_id uuid, p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select p_design_id is null or exists (
    select 1
    from public.broadcast_designs d
    where d.id = p_design_id
      and d.is_active = true
      and (
        d.design_type = 'SYSTEM'
        or (
          d.design_type = 'CUSTOM'
          and d.organization_id = p_organization_id
          and (select private.user_has_active_pro_membership(p_organization_id))
        )
      )
  );
$function$;

grant execute on function private.design_available_for_org(uuid,uuid) to authenticated;

drop policy if exists broadcast_designs_authenticated_read on public.broadcast_designs;
drop policy if exists broadcast_designs_member_read on public.broadcast_designs;
drop policy if exists broadcast_designs_system_read on public.broadcast_designs;

create policy broadcast_designs_authenticated_read
on public.broadcast_designs
for select
to authenticated
using (
  (design_type = 'SYSTEM' and is_active = true)
  or (select private.is_platform_admin())
  or (
    design_type = 'CUSTOM'
    and organization_id is not null
    and (select private.user_has_active_pro_membership(organization_id))
    and (select private.user_has_org_role(organization_id, array['OWNER','OPERATOR','VIEWER']::text[]))
  )
);

drop policy if exists broadcast_designs_insert on public.broadcast_designs;
create policy broadcast_designs_insert
on public.broadcast_designs
for insert
to authenticated
with check (
  (select private.is_platform_admin())
  or (
    design_type = 'CUSTOM'
    and organization_id is not null
    and created_by = (select auth.uid())
    and (select private.user_can_manage_custom_design(organization_id))
  )
);

drop policy if exists broadcast_designs_update on public.broadcast_designs;
create policy broadcast_designs_update
on public.broadcast_designs
for update
to authenticated
using (
  (select private.is_platform_admin())
  or (
    design_type = 'CUSTOM'
    and (select private.user_can_manage_custom_design(organization_id))
  )
)
with check (
  (select private.is_platform_admin())
  or (
    design_type = 'CUSTOM'
    and organization_id is not null
    and (select private.user_can_manage_custom_design(organization_id))
  )
);

drop policy if exists broadcast_designs_delete on public.broadcast_designs;
create policy broadcast_designs_delete
on public.broadcast_designs
for delete
to authenticated
using (
  (select private.is_platform_admin())
  or (
    design_type = 'CUSTOM'
    and (select private.user_can_manage_custom_design(organization_id))
  )
);

drop policy if exists broadcast_design_assets_authenticated_read on public.broadcast_design_assets;
create policy broadcast_design_assets_authenticated_read
on public.broadcast_design_assets
for select
to authenticated
using (
  (select private.is_platform_admin())
  or exists (
    select 1
    from public.broadcast_designs d
    where d.id = broadcast_design_assets.design_id
      and (
        d.design_type = 'SYSTEM'
        or (
          d.design_type = 'CUSTOM'
          and (select private.user_has_active_pro_membership(broadcast_design_assets.organization_id))
        )
      )
      and d.organization_id is not distinct from broadcast_design_assets.organization_id
  )
);

drop policy if exists broadcast_design_assets_insert on public.broadcast_design_assets;
create policy broadcast_design_assets_insert
on public.broadcast_design_assets
for insert
to authenticated
with check (
  (select private.is_platform_admin())
  or (
    created_by = (select auth.uid())
    and (select private.user_can_manage_custom_design(organization_id))
    and exists (
      select 1
      from public.broadcast_designs d
      where d.id = design_id
        and d.design_type = 'CUSTOM'
        and d.organization_id = broadcast_design_assets.organization_id
        and d.is_active = true
    )
  )
);

drop policy if exists broadcast_design_assets_update on public.broadcast_design_assets;
create policy broadcast_design_assets_update
on public.broadcast_design_assets
for update
to authenticated
using (
  (select private.is_platform_admin())
  or (
    (select private.user_can_manage_custom_design(organization_id))
    and exists (
      select 1
      from public.broadcast_designs d
      where d.id = design_id
        and d.design_type = 'CUSTOM'
        and d.organization_id = broadcast_design_assets.organization_id
        and d.is_active = true
    )
  )
)
with check (
  (select private.is_platform_admin())
  or (
    (select private.user_can_manage_custom_design(organization_id))
    and exists (
      select 1
      from public.broadcast_designs d
      where d.id = design_id
        and d.design_type = 'CUSTOM'
        and d.organization_id = broadcast_design_assets.organization_id
        and d.is_active = true
    )
  )
);

drop policy if exists broadcast_design_assets_delete on public.broadcast_design_assets;
create policy broadcast_design_assets_delete
on public.broadcast_design_assets
for delete
to authenticated
using (
  (select private.is_platform_admin())
  or (
    (select private.user_can_manage_custom_design(organization_id))
    and exists (
      select 1
      from public.broadcast_designs d
      where d.id = design_id
        and d.design_type = 'CUSTOM'
        and d.organization_id = broadcast_design_assets.organization_id
    )
  )
);

-- The old exception was broader than its comment suggested: RLS cannot tell
-- which tournament columns were changed, so it could authorize unrelated
-- tournament updates for a workspace without an active subscription.
drop policy if exists tournaments_design_assignment_update on public.tournaments;

drop policy if exists broadcast_assets_insert on storage.objects;
create policy broadcast_assets_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'broadcast-assets'
  and (storage.foldername(name))[1] is not null
  and (storage.foldername(name))[2] is not null
  and (select private.user_can_manage_custom_design(((storage.foldername(name))[1])::uuid))
  and exists (
    select 1
    from public.broadcast_designs d
    where d.id = ((storage.foldername(name))[2])::uuid
      and d.organization_id = ((storage.foldername(name))[1])::uuid
      and d.design_type = 'CUSTOM'
      and d.is_active = true
  )
);

drop policy if exists broadcast_assets_update on storage.objects;
create policy broadcast_assets_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'broadcast-assets'
  and (select private.user_can_manage_custom_design(((storage.foldername(name))[1])::uuid))
  and exists (
    select 1
    from public.broadcast_designs d
    where d.id = ((storage.foldername(name))[2])::uuid
      and d.organization_id = ((storage.foldername(name))[1])::uuid
      and d.design_type = 'CUSTOM'
  )
)
with check (
  bucket_id = 'broadcast-assets'
  and (select private.user_can_manage_custom_design(((storage.foldername(name))[1])::uuid))
  and exists (
    select 1
    from public.broadcast_designs d
    where d.id = ((storage.foldername(name))[2])::uuid
      and d.organization_id = ((storage.foldername(name))[1])::uuid
      and d.design_type = 'CUSTOM'
  )
);

drop policy if exists broadcast_assets_delete on storage.objects;
create policy broadcast_assets_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'broadcast-assets'
  and (select private.user_can_manage_custom_design(((storage.foldername(name))[1])::uuid))
  and exists (
    select 1
    from public.broadcast_designs d
    where d.id = ((storage.foldername(name))[2])::uuid
      and d.organization_id = ((storage.foldername(name))[1])::uuid
      and d.design_type = 'CUSTOM'
  )
);

create index if not exists idx_broadcast_design_assets_created_by
  on public.broadcast_design_assets(created_by);
create index if not exists idx_broadcast_designs_created_by
  on public.broadcast_designs(created_by);
create index if not exists idx_organizations_owner_id
  on public.organizations(owner_id);
create index if not exists idx_subscriptions_plan_id
  on public.subscriptions(plan_id);

update public.subscription_plans
set features = case
  when id = 'STARTER' then jsonb_build_array(
    jsonb_build_object('label','Tournament & roster setup','enabled',true),
    jsonb_build_object('label','Manual kill & elimination scoring','enabled',true),
    jsonb_build_object('label','Review / Verify & Publish','enabled',true),
    jsonb_build_object('label','Broadcast scene workflow','enabled',true),
    jsonb_build_object('label','OBS browser-source overlay','enabled',true),
    jsonb_build_object('label','System Design Packs','enabled',true),
    jsonb_build_object('label','Custom Design Studio','enabled',false),
    jsonb_build_object('label','Overall standings & results','enabled',true),
    jsonb_build_object('label','Cloud OCR','enabled',false),
    jsonb_build_object('label','Local OCR / CV','enabled',false),
    jsonb_build_object('label','OCR automation','enabled',false)
  )
  when id = 'PRO' then jsonb_build_array(
    jsonb_build_object('label','Everything in Starter','enabled',true),
    jsonb_build_object('label','Custom Design Studio','enabled',true),
    jsonb_build_object('label','Local OCR / CV','enabled',true),
    jsonb_build_object('label','OCR-assisted result import','enabled',true),
    jsonb_build_object('label','Cloud OCR fallback','enabled',true),
    jsonb_build_object('label','2,000 Cloud OCR Units / month','enabled',true),
    jsonb_build_object('label','Advanced data & history','enabled',true),
    jsonb_build_object('label','Automation features','enabled',true)
  )
  else features
end,
updated_at = now()
where id in ('STARTER','PRO');

notify pgrst, 'reload schema';
