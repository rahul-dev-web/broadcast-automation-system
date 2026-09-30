-- Broadcast Automation System
-- Secure platform admin identity and add the broadcast theme engine.

create schema if not exists private;

create or replace function private.is_platform_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = (select auth.uid())
      and p.platform_role = 'PLATFORM_ADMIN'
      and lower(coalesce(u.email, '')) = 'jaraho9@gmail.com'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare new_org_id uuid; assigned_role text;
begin
  assigned_role := case when lower(coalesce(new.email, '')) = 'jaraho9@gmail.com'
    then 'PLATFORM_ADMIN' else 'USER' end;

  insert into public.profiles (id,email,full_name,platform_role)
  values (new.id,coalesce(new.email,''),nullif(new.raw_user_meta_data ->> 'full_name',''),assigned_role);

  insert into public.organizations (name,owner_id)
  values (
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name',''),
      split_part(coalesce(new.email,'workspace'),'@',1)) || ' Workspace',
    new.id
  ) returning id into new_org_id;

  insert into public.organization_members (organization_id,user_id,role)
  values (new_org_id,new.id,'OWNER');

  return new;
end;
$$;

update public.profiles
set platform_role = case when lower(coalesce(email,'')) = 'jaraho9@gmail.com'
  then 'PLATFORM_ADMIN' else 'USER' end,
  updated_at = now();

drop policy if exists profiles_self_or_admin_update on public.profiles;
create policy profiles_self_or_admin_update on public.profiles
for update to authenticated
using ((select auth.uid()) = id or (select private.is_platform_admin()))
with check (
  ((select auth.uid()) = id and platform_role = 'USER')
  or (select private.is_platform_admin())
);

revoke update on table public.profiles from authenticated;
grant update (full_name) on table public.profiles to authenticated;

create table if not exists public.broadcast_themes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  theme_type text not null check (theme_type in ('SYSTEM','CUSTOM')),
  preset_id text unique,
  config jsonb not null default '{}'::jsonb,
  assets jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint broadcast_themes_system_custom_scope check (
    (theme_type = 'SYSTEM' and organization_id is null)
    or (theme_type = 'CUSTOM' and organization_id is not null)
  )
);

create index if not exists idx_broadcast_themes_org on public.broadcast_themes(organization_id);
create index if not exists idx_broadcast_themes_type on public.broadcast_themes(theme_type);

alter table public.tournaments
  add column if not exists theme_id uuid references public.broadcast_themes(id) on delete set null;
create index if not exists idx_tournaments_theme on public.tournaments(theme_id);

create or replace function private.theme_available_for_org(p_theme_id uuid,p_organization_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_theme_id is null or exists (
    select 1 from public.broadcast_themes bt
    where bt.id=p_theme_id and (bt.theme_type='SYSTEM' or bt.organization_id=p_organization_id)
  );
$$;

alter table public.broadcast_themes enable row level security;
revoke all on table public.broadcast_themes from anon,authenticated;
grant select on table public.broadcast_themes to anon,authenticated;
grant insert,update,delete on table public.broadcast_themes to authenticated;

drop policy if exists broadcast_themes_read on public.broadcast_themes;
create policy broadcast_themes_read on public.broadcast_themes
for select to anon,authenticated
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

drop policy if exists broadcast_themes_insert on public.broadcast_themes;
create policy broadcast_themes_insert on public.broadcast_themes
for insert to authenticated
with check (
  (select private.is_platform_admin())
  or (
    theme_type='CUSTOM' and organization_id is not null
    and created_by=(select auth.uid())
    and (select private.user_can_manage_org(organization_id))
  )
);

drop policy if exists broadcast_themes_update on public.broadcast_themes;
create policy broadcast_themes_update on public.broadcast_themes
for update to authenticated
using (
  (select private.is_platform_admin())
  or (theme_type='CUSTOM' and (select private.user_can_manage_org(organization_id)))
)
with check (
  (select private.is_platform_admin())
  or (
    theme_type='CUSTOM' and organization_id is not null
    and (select private.user_can_manage_org(organization_id))
  )
);

drop policy if exists broadcast_themes_delete on public.broadcast_themes;
create policy broadcast_themes_delete on public.broadcast_themes
for delete to authenticated
using (
  (select private.is_platform_admin())
  or (theme_type='CUSTOM' and (select private.user_can_manage_org(organization_id)))
);

drop policy if exists tournaments_manage_insert on public.tournaments;
create policy tournaments_manage_insert on public.tournaments
for insert to authenticated
with check (
  created_by=(select auth.uid())
  and quota_exempt=false
  and (select private.user_can_create_tournament(organization_id))
  and (select private.theme_available_for_org(theme_id,organization_id))
);

drop policy if exists tournaments_manage_update on public.tournaments;
create policy tournaments_manage_update on public.tournaments
for update to authenticated
using ((select private.user_can_manage_tournament(id)))
with check (
  (select private.user_can_manage_tournament(id))
  and quota_exempt=false
  and (select private.theme_available_for_org(theme_id,organization_id))
);

insert into public.broadcast_themes (name,theme_type,preset_id,config,assets)
values
('Arena Dark','SYSTEM','arena-dark','{"version":1,"branding":{"label":"ARENA BROADCAST","mark":"BA"},"colors":{"primary":"#7c5cff","secondary":"#25d0a5","accent":"#ffffff","background":"#070a0f","panel":"rgba(14,19,27,.90)","panelStrong":"rgba(8,12,18,.96)","text":"#f3f6fb","muted":"#8e9caf","border":"rgba(124,92,255,.32)"},"typography":{"heading":"Arial, Helvetica, sans-serif","body":"Arial, Helvetica, sans-serif","weight":900,"tracking":".08em"},"shape":{"radius":"14px","border":"1px","shadow":"0 18px 45px rgba(0,0,0,.28)","clip":"polygon(0 0,97% 0,100% 16%,100% 100%,3% 100%,0 84%)"},"effects":{"glow":"0 0 22px rgba(124,92,255,.22)","transition":"linear-gradient(90deg,transparent,#7c5cff,transparent)"},"canvas":{"backgroundMode":"transparent","backgroundColor":"transparent","backgroundImage":null},"stages":{"ROSTER_1":{"backgroundMode":"gradient","panelOpacity":".90"},"ROSTER_2":{"backgroundMode":"gradient","panelOpacity":".90"},"ROOM":{"backgroundMode":"gradient","panelOpacity":".78"},"MATCH_LIVE":{"backgroundMode":"transparent","panelOpacity":".78"},"MATCH_REVIEW":{"backgroundMode":"transparent","panelOpacity":".78"},"MATCH_VERIFIED":{"backgroundMode":"gradient","panelOpacity":".92"},"MATCH_PT":{"backgroundMode":"gradient","panelOpacity":".92"},"OVERALL":{"backgroundMode":"gradient","panelOpacity":".92"},"THANK_YOU":{"backgroundMode":"gradient","panelOpacity":".90"}}}','{}'),
('Neon Arena','SYSTEM','neon-arena','{"version":1,"branding":{"label":"NEON ARENA","mark":"NA"},"colors":{"primary":"#00e5ff","secondary":"#8b5cf6","accent":"#f8fafc","background":"#05050b","panel":"rgba(10,12,24,.86)","panelStrong":"rgba(5,6,15,.94)","text":"#f8fafc","muted":"#94a3b8","border":"rgba(0,229,255,.34)"},"typography":{"heading":"Arial, Helvetica, sans-serif","body":"Arial, Helvetica, sans-serif","weight":900,"tracking":".10em"},"shape":{"radius":"10px","border":"1px","shadow":"0 18px 50px rgba(0,0,0,.32)","clip":"polygon(0 0,98% 0,100% 12%,100% 100%,2% 100%,0 88%)"},"effects":{"glow":"0 0 28px rgba(0,229,255,.20)","transition":"linear-gradient(90deg,transparent,#00e5ff,transparent)"},"canvas":{"backgroundMode":"transparent","backgroundColor":"transparent","backgroundImage":null},"stages":{"ROSTER_1":{"backgroundMode":"gradient","panelOpacity":".86"},"ROSTER_2":{"backgroundMode":"gradient","panelOpacity":".86"},"ROOM":{"backgroundMode":"gradient","panelOpacity":".72"},"MATCH_LIVE":{"backgroundMode":"transparent","panelOpacity":".74"},"MATCH_REVIEW":{"backgroundMode":"transparent","panelOpacity":".74"},"MATCH_VERIFIED":{"backgroundMode":"gradient","panelOpacity":".90"},"MATCH_PT":{"backgroundMode":"gradient","panelOpacity":".90"},"OVERALL":{"backgroundMode":"gradient","panelOpacity":".90"},"THANK_YOU":{"backgroundMode":"gradient","panelOpacity":".88"}}}','{}'),
('Championship','SYSTEM','championship','{"version":1,"branding":{"label":"CHAMPIONSHIP SERIES","mark":"CS"},"colors":{"primary":"#e2b35b","secondary":"#9b6a2e","accent":"#ffe4a1","background":"#0b080e","panel":"rgba(25,13,31,.90)","panelStrong":"rgba(11,8,14,.96)","text":"#fff7e7","muted":"#b4a6b8","border":"rgba(226,179,91,.34)"},"typography":{"heading":"Arial, Helvetica, sans-serif","body":"Arial, Helvetica, sans-serif","weight":1000,"tracking":".12em"},"shape":{"radius":"4px","border":"1px","shadow":"0 20px 55px rgba(0,0,0,.36)","clip":"polygon(0 0,97% 0,100% 16%,100% 100%,3% 100%,0 84%)"},"effects":{"glow":"0 0 24px rgba(226,179,91,.22)","transition":"linear-gradient(90deg,transparent,#e2b35b,transparent)"},"canvas":{"backgroundMode":"transparent","backgroundColor":"transparent","backgroundImage":null},"stages":{"ROSTER_1":{"backgroundMode":"gradient","panelOpacity":".90"},"ROSTER_2":{"backgroundMode":"gradient","panelOpacity":".90"},"ROOM":{"backgroundMode":"gradient","panelOpacity":".78"},"MATCH_LIVE":{"backgroundMode":"transparent","panelOpacity":".78"},"MATCH_REVIEW":{"backgroundMode":"transparent","panelOpacity":".78"},"MATCH_VERIFIED":{"backgroundMode":"gradient","panelOpacity":".92"},"MATCH_PT":{"backgroundMode":"gradient","panelOpacity":".92"},"OVERALL":{"backgroundMode":"gradient","panelOpacity":".92"},"THANK_YOU":{"backgroundMode":"gradient","panelOpacity":".90"}}}','{}'),
('Clean Broadcast','SYSTEM','clean-broadcast','{"version":1,"branding":{"label":"CLEAN BROADCAST","mark":"CB"},"colors":{"primary":"#2563eb","secondary":"#14b8a6","accent":"#ffffff","background":"#08111f","panel":"rgba(10,22,39,.82)","panelStrong":"rgba(7,15,27,.94)","text":"#f8fafc","muted":"#94a3b8","border":"rgba(37,99,235,.34)"},"typography":{"heading":"Arial, Helvetica, sans-serif","body":"Arial, Helvetica, sans-serif","weight":900,"tracking":".07em"},"shape":{"radius":"12px","border":"1px","shadow":"0 16px 42px rgba(0,0,0,.24)","clip":"none"},"effects":{"glow":"0 0 20px rgba(37,99,235,.18)","transition":"linear-gradient(90deg,transparent,#2563eb,transparent)"},"canvas":{"backgroundMode":"transparent","backgroundColor":"transparent","backgroundImage":null},"stages":{"ROSTER_1":{"backgroundMode":"gradient","panelOpacity":".82"},"ROSTER_2":{"backgroundMode":"gradient","panelOpacity":".82"},"ROOM":{"backgroundMode":"gradient","panelOpacity":".72"},"MATCH_LIVE":{"backgroundMode":"transparent","panelOpacity":".72"},"MATCH_REVIEW":{"backgroundMode":"transparent","panelOpacity":".72"},"MATCH_VERIFIED":{"backgroundMode":"gradient","panelOpacity":".86"},"MATCH_PT":{"backgroundMode":"gradient","panelOpacity":".86"},"OVERALL":{"backgroundMode":"gradient","panelOpacity":".86"},"THANK_YOU":{"backgroundMode":"gradient","panelOpacity":".84"}}}','{}')
on conflict (preset_id) do update set name=excluded.name,config=excluded.config,assets=excluded.assets,updated_at=now();
