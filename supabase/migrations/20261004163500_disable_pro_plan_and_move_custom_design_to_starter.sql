-- Disable Pro for the current client-facing product release.
-- Keep the Pro implementation in the codebase for a future relaunch.
-- Starter temporarily owns Custom Design Studio and asset uploads.

update public.subscription_plans
set
  enabled = false,
  coming_soon = true,
  price_inr = 0,
  initial_tournaments = 0,
  renewal_tournaments = 0,
  addon_tournaments = 2,
  included_ocr_units = 0,
  addon_ocr_units = 0,
  updated_at = now()
where id = 'PRO';

update public.subscriptions
set
  plan_id = 'STARTER',
  included_tournaments = 5,
  included_ocr_units = 0,
  addon_ocr_units = 0,
  ocr_units_used = 0,
  updated_at = now()
where plan_id = 'PRO';

create or replace function private.user_has_active_custom_design_membership(p_organization_id uuid)
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
    where om.organization_id = p_organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('OWNER','OPERATOR','VIEWER')
      and s.status = 'ACTIVE'
      and s.expires_at > now()
      and s.plan_id = 'STARTER'
  ) or (select private.is_platform_admin());
$function$;

grant execute on function private.user_has_active_custom_design_membership(uuid) to authenticated;

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
    where om.organization_id = p_organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('OWNER','OPERATOR')
      and s.status = 'ACTIVE'
      and s.expires_at > now()
      and s.plan_id = 'STARTER'
  ) or (select private.is_platform_admin());
$function$;

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
          and (select private.user_has_active_custom_design_membership(p_organization_id))
        )
      )
  );
$function$;

update public.subscription_plans
set features = jsonb_build_array(
  jsonb_build_object('label','Tournament & roster setup','enabled',true),
  jsonb_build_object('label','Manual kill & elimination scoring','enabled',true),
  jsonb_build_object('label','Review / Verify & Publish','enabled',true),
  jsonb_build_object('label','Broadcast scene workflow','enabled',true),
  jsonb_build_object('label','OBS browser-source overlay','enabled',true),
  jsonb_build_object('label','System Design Packs','enabled',true),
  jsonb_build_object('label','Custom Design Studio','enabled',true),
  jsonb_build_object('label','Overall standings & results','enabled',true),
  jsonb_build_object('label','Cloud OCR','enabled',false),
  jsonb_build_object('label','Local OCR / CV','enabled',false),
  jsonb_build_object('label','OCR automation','enabled',false)
),
updated_at = now()
where id = 'STARTER';

notify pgrst, 'reload schema';
