-- ArenaCast Phase 1: plan entitlements and cloud OCR usage accounting.
-- Pro: 5 tournaments/month + 2,000 Cloud OCR Units.
-- Pro add-on: +2 tournaments + 1,000 Cloud OCR Units.

alter table public.subscription_plans
  add column if not exists included_ocr_units integer not null default 0
    check (included_ocr_units >= 0),
  add column if not exists addon_ocr_units integer not null default 0
    check (addon_ocr_units >= 0);

alter table public.subscriptions
  add column if not exists included_ocr_units integer not null default 0
    check (included_ocr_units >= 0),
  add column if not exists addon_ocr_units integer not null default 0
    check (addon_ocr_units >= 0),
  add column if not exists ocr_units_used integer not null default 0
    check (ocr_units_used >= 0);

create table if not exists public.ocr_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  source_type text not null check (
    source_type in (
      'FINAL_STANDING',
      'LIVE_PLAYER',
      'KILL_FEED',
      'CLOUD_FALLBACK',
      'OTHER'
    )
  ),
  units_used integer not null check (units_used > 0),
  provider text not null default 'GOOGLE_VISION',
  request_id text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ocr_usage enable row level security;

revoke all on table public.ocr_usage from anon, authenticated;
grant select on table public.ocr_usage to authenticated;
grant all on table public.ocr_usage to service_role;

drop policy if exists ocr_usage_member_read on public.ocr_usage;
create policy ocr_usage_member_read
on public.ocr_usage
for select
to authenticated
using (
  (select private.is_platform_admin())
  or exists (
    select 1
    from public.organization_members om
    where om.organization_id = ocr_usage.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('OWNER','OPERATOR','VIEWER')
  )
);

create index if not exists idx_ocr_usage_organization_created
  on public.ocr_usage(organization_id, created_at desc);
create index if not exists idx_ocr_usage_tournament
  on public.ocr_usage(tournament_id, created_at desc);
create index if not exists idx_ocr_usage_match
  on public.ocr_usage(match_id, created_at desc);

update public.subscription_plans
set
  initial_tournaments = 5,
  renewal_tournaments = 5,
  addon_tournaments = 2,
  addon_price_inr = case when id = 'STARTER' then 100 else addon_price_inr end,
  included_ocr_units = case when id = 'PRO' then 2000 else 0 end,
  addon_ocr_units = case when id = 'PRO' then 1000 else 0 end,
  features = case
    when id = 'STARTER' then jsonb_build_array(
      jsonb_build_object('label','Tournament & roster setup','enabled',true),
      jsonb_build_object('label','Manual kill & elimination scoring','enabled',true),
      jsonb_build_object('label','Review / Verify & Publish','enabled',true),
      jsonb_build_object('label','Broadcast scene workflow','enabled',true),
      jsonb_build_object('label','OBS browser-source overlay','enabled',true),
      jsonb_build_object('label','System Design Packs','enabled',true),
      jsonb_build_object('label','Overall standings & results','enabled',true),
      jsonb_build_object('label','Cloud OCR','enabled',false),
      jsonb_build_object('label','Local OCR / CV','enabled',false),
      jsonb_build_object('label','OCR automation','enabled',false)
    )
    when id = 'PRO' then jsonb_build_array(
      jsonb_build_object('label','Everything in Starter','enabled',true),
      jsonb_build_object('label','Local OCR / CV','enabled',true),
      jsonb_build_object('label','OCR-assisted result import','enabled',true),
      jsonb_build_object('label','Cloud OCR fallback','enabled',true),
      jsonb_build_object('label','2,000 Cloud OCR Units / month','enabled',true),
      jsonb_build_object('label','Advanced data & history','enabled',true),
      jsonb_build_object('label','Automation features','enabled',true)
    )
    else features
  end,
  updated_at = now();

update public.subscriptions s
set
  included_ocr_units = coalesce(p.included_ocr_units, 0),
  addon_ocr_units = 0,
  ocr_units_used = 0,
  included_tournaments = case
    when p.id in ('STARTER','PRO') then 5
    else s.included_tournaments
  end,
  updated_at = now()
from public.subscription_plans p
where s.plan_id = p.id;

create or replace function public.platform_activate_subscription(
  p_organization_id uuid,
  p_plan_id text,
  p_days integer default 30
)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $function$
declare
  plan_row public.subscription_plans;
  sub_row public.subscriptions;
  has_previous boolean;
  duration integer;
begin
  if not (select private.is_platform_admin()) then
    raise exception 'Platform admin access required';
  end if;

  select * into plan_row
  from public.subscription_plans
  where id = p_plan_id;

  if not found then
    raise exception 'Unknown subscription plan';
  end if;

  if not plan_row.enabled then
    raise exception 'This plan is not currently activatable';
  end if;

  duration := greatest(1, least(coalesce(p_days, plan_row.duration_days), 365));

  select exists(
    select 1 from public.subscriptions
    where organization_id = p_organization_id
  ) into has_previous;

  insert into public.subscriptions (
    organization_id,
    plan_id,
    status,
    starts_at,
    expires_at,
    included_tournaments,
    addon_tournaments,
    included_ocr_units,
    addon_ocr_units,
    ocr_units_used,
    activation_count,
    updated_at
  )
  values (
    p_organization_id,
    p_plan_id,
    'ACTIVE',
    now(),
    now() + make_interval(days => duration),
    case
      when p_plan_id in ('STARTER','PRO') then 5
      when not has_previous then plan_row.initial_tournaments
      else plan_row.renewal_tournaments
    end,
    0,
    coalesce(plan_row.included_ocr_units, 0),
    0,
    0,
    1,
    now()
  )
  on conflict (organization_id) do update set
    plan_id = excluded.plan_id,
    status = 'ACTIVE',
    starts_at = now(),
    expires_at = now() + make_interval(days => duration),
    included_tournaments = case
      when excluded.plan_id in ('STARTER','PRO') then 5
      else plan_row.renewal_tournaments
    end,
    addon_tournaments = 0,
    included_ocr_units = coalesce(plan_row.included_ocr_units, 0),
    addon_ocr_units = 0,
    ocr_units_used = 0,
    activation_count = public.subscriptions.activation_count + 1,
    updated_at = now()
  returning * into sub_row;

  return sub_row;
end;
$function$;

create or replace function public.platform_add_tournament_credits(
  p_organization_id uuid,
  p_credits integer default 2
)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $function$
declare
  sub_row public.subscriptions;
  plan_row public.subscription_plans;
  credits integer := greatest(1, p_credits);
  bundles integer;
begin
  if not (select private.is_platform_admin()) then
    raise exception 'Platform admin access required';
  end if;

  select s.*, p.addon_tournaments as plan_addon_tournaments,
         p.addon_ocr_units as plan_addon_ocr_units
  into sub_row
  from public.subscriptions s
  join public.subscription_plans p on p.id = s.plan_id
  where s.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Organization has no subscription';
  end if;

  select * into plan_row
  from public.subscription_plans
  where id = sub_row.plan_id;

  if plan_row.addon_tournaments <= 0 then
    raise exception 'This plan does not support tournament add-ons';
  end if;

  if mod(credits, plan_row.addon_tournaments) <> 0 then
    raise exception 'Tournament add-ons must be purchased in %-tournament bundles', plan_row.addon_tournaments;
  end if;

  bundles := credits / plan_row.addon_tournaments;

  update public.subscriptions
  set
    addon_tournaments = addon_tournaments + credits,
    addon_ocr_units = addon_ocr_units + (bundles * coalesce(plan_row.addon_ocr_units, 0)),
    updated_at = now()
  where organization_id = p_organization_id
  returning * into sub_row;

  return sub_row;
end;
$function$;

create or replace function public.consume_ocr_units(
  p_organization_id uuid,
  p_units integer,
  p_source_type text,
  p_tournament_id uuid default null,
  p_match_id uuid default null,
  p_provider text default 'GOOGLE_VISION',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  sub_row public.subscriptions;
  usage_row public.ocr_usage;
  requested integer := coalesce(p_units, 0);
  available integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if requested <= 0 then
    raise exception 'OCR units must be greater than zero';
  end if;

  if p_source_type not in ('FINAL_STANDING','LIVE_PLAYER','KILL_FEED','CLOUD_FALLBACK','OTHER') then
    raise exception 'Invalid OCR source type';
  end if;

  if p_request_id is not null then
    select * into usage_row
    from public.ocr_usage
    where request_id = p_request_id;

    if found then
      select s.* into sub_row
      from public.subscriptions s
      where s.organization_id = p_organization_id;

      if usage_row.organization_id <> p_organization_id then
        raise exception 'OCR request belongs to another organization';
      end if;

      return jsonb_build_object(
        'usage_id', usage_row.id,
        'units_used', usage_row.units_used,
        'remaining_units',
          greatest(0, coalesce(sub_row.included_ocr_units,0) + coalesce(sub_row.addon_ocr_units,0) - coalesce(sub_row.ocr_units_used,0)),
        'idempotent', true
      );
    end if;
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('OWNER','OPERATOR')
  ) and not (select private.is_platform_admin()) then
    raise exception 'OCR access is not available for this workspace';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_organization_id::text, 0)
  );

  select s.* into sub_row
  from public.subscriptions s
  where s.organization_id = p_organization_id
    and s.status = 'ACTIVE'
    and s.expires_at > now()
  for update;

  if not found then
    raise exception 'No active subscription';
  end if;

  if sub_row.plan_id <> 'PRO' then
    raise exception 'Cloud OCR is a Pro feature';
  end if;

  available := coalesce(sub_row.included_ocr_units, 0)
    + coalesce(sub_row.addon_ocr_units, 0)
    - coalesce(sub_row.ocr_units_used, 0);

  if requested > available then
    raise exception 'OCR quota exceeded: % units remaining, % requested', available, requested;
  end if;

  update public.subscriptions
  set ocr_units_used = ocr_units_used + requested,
      updated_at = now()
  where id = sub_row.id
  returning * into sub_row;

  insert into public.ocr_usage (
    organization_id,
    tournament_id,
    match_id,
    source_type,
    units_used,
    provider,
    request_id,
    metadata
  )
  values (
    p_organization_id,
    p_tournament_id,
    p_match_id,
    p_source_type,
    requested,
    coalesce(nullif(p_provider,''), 'GOOGLE_VISION'),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into usage_row;

  return jsonb_build_object(
    'usage_id', usage_row.id,
    'units_used', requested,
    'remaining_units',
      greatest(0, coalesce(sub_row.included_ocr_units,0) + coalesce(sub_row.addon_ocr_units,0) - coalesce(sub_row.ocr_units_used,0)),
    'idempotent', false
  );
end;
$function$;

revoke execute on function public.consume_ocr_units(uuid, integer, text, uuid, uuid, text, text, jsonb) from public, anon;
grant execute on function public.consume_ocr_units(uuid, integer, text, uuid, uuid, text, text, jsonb) to authenticated;

grant execute on function public.platform_activate_subscription(uuid, text, integer) to authenticated;
grant execute on function public.platform_add_tournament_credits(uuid, integer) to authenticated;
