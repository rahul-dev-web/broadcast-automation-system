-- Broadcast Design Studio migration
-- Reusable design packs, organization-scoped assets, storage and tournament synchronization.

create table if not exists public.broadcast_designs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  theme_id uuid references public.broadcast_themes(id) on delete set null,
  name text not null,
  description text,
  design_type text not null check (design_type in ('SYSTEM','CUSTOM')),
  preset_id text unique,
  version integer not null default 1,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint broadcast_designs_scope check (
    (design_type = 'SYSTEM' and organization_id is null)
    or (design_type = 'CUSTOM' and organization_id is not null)
  )
);

create index if not exists idx_broadcast_designs_org on public.broadcast_designs(organization_id);
create index if not exists idx_broadcast_designs_theme on public.broadcast_designs(theme_id);
create index if not exists idx_broadcast_designs_type on public.broadcast_designs(design_type);

create table if not exists public.broadcast_design_assets (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.broadcast_designs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_type text not null check (asset_type in (
    'FONT','LOGO','IMAGE','BACKGROUND','OVERLAY','LOWER_THIRD',
    'PLAYER_CARD','TEAM_CARD','SCOREBOARD','STANDINGS','WINNER',
    'INTRO','MATCH_INTRO','BOOYAH','TRANSITION','OUTRO','OTHER'
  )),
  stage text,
  slot text not null,
  name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint,
  width integer,
  height integer,
  duration_ms integer,
  fps numeric,
  config jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_broadcast_design_assets_design on public.broadcast_design_assets(design_id);
create index if not exists idx_broadcast_design_assets_org on public.broadcast_design_assets(organization_id);
create index if not exists idx_broadcast_design_assets_stage on public.broadcast_design_assets(stage);

alter table public.tournaments
  add column if not exists design_id uuid references public.broadcast_designs(id) on delete set null;
create index if not exists idx_tournaments_design on public.tournaments(design_id);

create or replace function private.design_available_for_org(p_design_id uuid,p_organization_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_design_id is null or exists (
    select 1 from public.broadcast_designs d
    where d.id=p_design_id and (d.design_type='SYSTEM' or d.organization_id=p_organization_id)
  );
$$;

grant execute on function private.design_available_for_org(uuid,uuid) to authenticated;

revoke all on table public.broadcast_designs from anon,authenticated;
grant select on table public.broadcast_designs to anon,authenticated;
grant insert,update,delete on table public.broadcast_designs to authenticated;

revoke all on table public.broadcast_design_assets from anon,authenticated;
grant select on table public.broadcast_design_assets to anon,authenticated;
grant insert,update,delete on table public.broadcast_design_assets to authenticated;

alter table public.broadcast_designs enable row level security;
alter table public.broadcast_design_assets enable row level security;

drop policy if exists broadcast_designs_read on public.broadcast_designs;
create policy broadcast_designs_read on public.broadcast_designs
for select to anon,authenticated
using (
  design_type='SYSTEM'
  or (select private.is_platform_admin())
  or (organization_id is not null and (select private.user_has_org_role(organization_id,array['OWNER','OPERATOR','VIEWER']::text[])))
  or (
    design_type='CUSTOM'
    and exists (
      select 1 from public.tournaments t
      where t.design_id=broadcast_designs.id
        and (select private.public_broadcast_access(t.id))
    )
  )
);

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
  )
);

drop policy if exists broadcast_designs_update on public.broadcast_designs;
create policy broadcast_designs_update on public.broadcast_designs
for update to authenticated
using ((select private.is_platform_admin()) or (design_type='CUSTOM' and (select private.user_can_manage_org(organization_id))))
with check ((select private.is_platform_admin()) or (design_type='CUSTOM' and organization_id is not null and (select private.user_can_manage_org(organization_id))));

drop policy if exists broadcast_designs_delete on public.broadcast_designs;
create policy broadcast_designs_delete on public.broadcast_designs
for delete to authenticated
using ((select private.is_platform_admin()) or (design_type='CUSTOM' and (select private.user_can_manage_org(organization_id))));

drop policy if exists broadcast_design_assets_read on public.broadcast_design_assets;
create policy broadcast_design_assets_read on public.broadcast_design_assets
for select to anon,authenticated
using (
  (select private.is_platform_admin())
  or (select private.user_has_org_role(organization_id,array['OWNER','OPERATOR','VIEWER']::text[]))
  or exists (
    select 1 from public.tournaments t
    where t.design_id=broadcast_design_assets.design_id
      and (select private.public_broadcast_access(t.id))
  )
);

drop policy if exists broadcast_design_assets_insert on public.broadcast_design_assets;
create policy broadcast_design_assets_insert on public.broadcast_design_assets
for insert to authenticated
with check (
  (select private.is_platform_admin())
  or (
    created_by=(select auth.uid())
    and (select private.user_can_manage_org(organization_id))
    and exists (
      select 1 from public.broadcast_designs d
      where d.id=design_id and d.design_type='CUSTOM' and d.organization_id=broadcast_design_assets.organization_id
    )
  )
);

drop policy if exists broadcast_design_assets_update on public.broadcast_design_assets;
create policy broadcast_design_assets_update on public.broadcast_design_assets
for update to authenticated
using ((select private.is_platform_admin()) or (select private.user_can_manage_org(organization_id)))
with check ((select private.is_platform_admin()) or (select private.user_can_manage_org(organization_id)));

drop policy if exists broadcast_design_assets_delete on public.broadcast_design_assets;
create policy broadcast_design_assets_delete on public.broadcast_design_assets
for delete to authenticated
using ((select private.is_platform_admin()) or (select private.user_can_manage_org(organization_id)));

drop policy if exists tournaments_manage_insert on public.tournaments;
create policy tournaments_manage_insert on public.tournaments
for insert to authenticated
with check (
  created_by=(select auth.uid())
  and quota_exempt=false
  and (select private.user_can_create_tournament(organization_id))
  and (select private.theme_available_for_org(theme_id,organization_id))
  and (select private.design_available_for_org(design_id,organization_id))
);

drop policy if exists tournaments_manage_update on public.tournaments;
create policy tournaments_manage_update on public.tournaments
for update to authenticated
using ((select private.user_can_manage_tournament(id)))
with check (
  (select private.user_can_manage_tournament(id))
  and quota_exempt=false
  and (select private.theme_available_for_org(theme_id,organization_id))
  and (select private.design_available_for_org(design_id,organization_id))
);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'broadcast-assets','broadcast-assets',true,262144000,
  array[
    'image/png','image/jpeg','image/webp','image/svg+xml',
    'video/mp4','video/webm',
    'font/ttf','font/otf','font/woff','font/woff2','application/octet-stream'
  ]::text[]
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists broadcast_assets_insert on storage.objects;
create policy broadcast_assets_insert on storage.objects
for insert to authenticated
with check (
  bucket_id='broadcast-assets'
  and (storage.foldername(name))[1] is not null
  and (storage.foldername(name))[2] is not null
  and (select private.user_can_manage_org(((storage.foldername(name))[1])::uuid))
);

drop policy if exists broadcast_assets_update on storage.objects;
create policy broadcast_assets_update on storage.objects
for update to authenticated
using (bucket_id='broadcast-assets' and (select private.user_can_manage_org(((storage.foldername(name))[1])::uuid))
)
with check (bucket_id='broadcast-assets' and (select private.user_can_manage_org(((storage.foldername(name))[1])::uuid)));

drop policy if exists broadcast_assets_delete on storage.objects;
create policy broadcast_assets_delete on storage.objects
for delete to authenticated
using (bucket_id='broadcast-assets' and (select private.user_can_manage_org(((storage.foldername(name))[1])::uuid)));

insert into public.broadcast_designs (name,description,design_type,preset_id,theme_id,config)
select v.name,v.description,'SYSTEM',v.preset_id,t.id,v.config::jsonb
from (values
('Angular Arena','Sharp esports geometry with high-energy motion and strong HUD framing.','angular-arena',
'{"version":1,"layout":{"style":"ANGULAR","density":"HIGH","safeMargin":48},"animations":{"entry":{"type":"SLIDE_LEFT","durationMs":420,"easing":"cubic-bezier(.2,.8,.2,1)"},"exit":{"type":"WIPE","durationMs":280,"easing":"ease-in"},"row":{"type":"SLIDE_UP","durationMs":300,"staggerMs":55},"stage":{"type":"WIPE","durationMs":520}},"stageDefaults":{"MATCH_LIVE":{"background":"TRANSPARENT","panel":"HUD"},"MATCH_REVIEW":{"background":"TRANSPARENT","panel":"HUD"}},"assetSlots":["font_primary","font_heading","logo_broadcast","logo_sponsor_1","background_global","background_roster","background_room","background_result","background_overall","lower_third","team_card","player_card","scoreboard","standings","winner","transition_stage","intro_starting","outro_thank_you"]}'),
('Championship Cinematic','Premium championship presentation with cinematic pacing and large type.','championship-cinematic',
'{"version":1,"layout":{"style":"CINEMATIC","density":"MEDIUM","safeMargin":56},"animations":{"entry":{"type":"REVEAL","durationMs":720,"easing":"ease-out"},"exit":{"type":"FADE","durationMs":420,"easing":"ease-in-out"},"row":{"type":"FADE_UP","durationMs":520,"staggerMs":90},"stage":{"type":"FADE","durationMs":700}},"stageDefaults":{"MATCH_LIVE":{"background":"TRANSPARENT","panel":"HUD"},"MATCH_REVIEW":{"background":"TRANSPARENT","panel":"HUD"}},"assetSlots":["font_heading","font_body","logo_broadcast","logo_sponsor_1","background_global","intro_starting","background_roster","background_room","winner","background_result","scoreboard","standings","transition_stage","outro_thank_you"]}'),
('Future Grid','Technology-led broadcast language with modular HUD panels and digital motion.','future-grid',
'{"version":1,"layout":{"style":"GRID","density":"HIGH","safeMargin":40},"animations":{"entry":{"type":"SCAN_REVEAL","durationMs":360,"easing":"linear"},"exit":{"type":"GLITCH_OUT","durationMs":240,"easing":"steps(3)"},"row":{"type":"DATA_IN","durationMs":260,"staggerMs":40},"stage":{"type":"DIGITAL_WIPE","durationMs":420}},"stageDefaults":{"MATCH_LIVE":{"background":"TRANSPARENT","panel":"HUD"},"MATCH_REVIEW":{"background":"TRANSPARENT","panel":"HUD"}},"assetSlots":["font_primary","font_mono","logo_broadcast","logo_sponsor_1","background_global","background_live","background_roster","background_room","hud_frame","lower_third","player_card","team_card","scoreboard","standings","transition_stage","outro_thank_you"]}'),
('Minimal Broadcast','Clean information-first package with restrained motion and transparent gameplay presentation.','minimal-broadcast',
'{"version":1,"layout":{"style":"MINIMAL","density":"LOW","safeMargin":64},"animations":{"entry":{"type":"FADE","durationMs":280,"easing":"ease-out"},"exit":{"type":"FADE","durationMs":220,"easing":"ease-in"},"row":{"type":"SLIDE_UP","durationMs":240,"staggerMs":35},"stage":{"type":"FADE","durationMs":360}},"stageDefaults":{"MATCH_LIVE":{"background":"TRANSPARENT","panel":"HUD"},"MATCH_REVIEW":{"background":"TRANSPARENT","panel":"HUD"}},"assetSlots":["font_primary","font_body","logo_broadcast","logo_sponsor_1","background_global","background_roster","background_room","scoreboard","standings","lower_third","transition_stage","outro_thank_you"]}')
) as v(name,description,preset_id,config)
join public.broadcast_themes t on t.preset_id=case v.preset_id
  when 'angular-arena' then 'arena-dark'
  when 'championship-cinematic' then 'championship'
  when 'future-grid' then 'neon-arena'
  when 'minimal-broadcast' then 'clean-broadcast'
end
on conflict (preset_id) do update set
  name=excluded.name,description=excluded.description,theme_id=excluded.theme_id,config=excluded.config,updated_at=now();
