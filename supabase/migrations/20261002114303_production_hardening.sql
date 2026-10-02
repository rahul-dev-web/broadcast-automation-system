-- Production hardening: authorization, design snapshots, asset ownership,
-- Pro-only match input mode, and approved local-OCR scoring.

alter table public.tournaments
  add column if not exists design_version integer,
  add column if not exists design_snapshot jsonb;

create or replace function private.snapshot_broadcast_design(p_design_id uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
  select case when d.id is null then null else jsonb_build_object(
    'design_id',d.id,'version',d.version,'config',d.config,
    'assets',coalesce((
      select jsonb_agg(jsonb_build_object(
        'slot',a.slot,'storage_path',a.storage_path,'mime_type',a.mime_type,'config',a.config
      ) order by a.slot,a.created_at,a.id)
      from public.broadcast_design_assets a
      where a.design_id=d.id
        and a.organization_id is not distinct from d.organization_id
    ),'[]'::jsonb)
  ) end
  from public.broadcast_designs d where d.id=p_design_id;
$$;

revoke execute on function private.snapshot_broadcast_design(uuid) from public,anon,authenticated;

create or replace function private.enforce_tournament_design_snapshot()
returns trigger language plpgsql security definer set search_path=''
as $$
declare snapshot jsonb;
begin
  if new.design_id is null then new.design_version=null; new.design_snapshot=null; return new; end if;
  snapshot:=private.snapshot_broadcast_design(new.design_id);
  if snapshot is null then raise exception 'Selected broadcast design does not exist.'; end if;
  new.design_version:=(snapshot->>'version')::integer;
  new.design_snapshot:=snapshot;
  return new;
end;
$$;
revoke execute on function private.enforce_tournament_design_snapshot() from public,anon,authenticated;
drop trigger if exists enforce_tournament_design_snapshot on public.tournaments;
create trigger enforce_tournament_design_snapshot before insert or update of design_id
on public.tournaments for each row execute function private.enforce_tournament_design_snapshot();

create or replace function private.enforce_broadcast_design_asset_org()
returns trigger language plpgsql security definer set search_path=''
as $$
declare design_org uuid; design_type text;
begin
  select d.organization_id,d.design_type into design_org,design_type
  from public.broadcast_designs d where d.id=new.design_id;
  if design_type is null then raise exception 'Broadcast design does not exist.'; end if;
  if new.organization_id is distinct from design_org then
    raise exception 'Broadcast asset organization must match its design organization.';
  end if;
  return new;
end;
$$;
revoke execute on function private.enforce_broadcast_design_asset_org() from public,anon,authenticated;
drop trigger if exists enforce_broadcast_design_asset_org on public.broadcast_design_assets;
create trigger enforce_broadcast_design_asset_org
before insert or update of design_id,organization_id on public.broadcast_design_assets
for each row execute function private.enforce_broadcast_design_asset_org();

create or replace function private.can_insert_tournament(
  p_organization_id uuid,p_created_by uuid,p_design_id uuid,p_quota_exempt boolean
)
returns boolean language sql stable security definer set search_path=''
as $$
select p_created_by=(select auth.uid())
and coalesce(p_quota_exempt,false)=false
and exists (
  select 1 from public.organization_members om
  join public.subscriptions s on s.organization_id=om.organization_id
  join public.subscription_plans sp on sp.id=s.plan_id
  where om.organization_id=p_organization_id and om.user_id=(select auth.uid())
    and om.role in ('OWNER','OPERATOR') and s.status='ACTIVE' and s.expires_at>now()
    and sp.enabled=true
    and (select count(*) from public.tournaments t
         where t.organization_id=p_organization_id and t.quota_exempt=false)
      < s.included_tournaments+s.addon_tournaments
)
and private.design_available_for_org(p_design_id,p_organization_id);
$$;

create or replace function private.enforce_tournament_insert()
returns trigger language plpgsql security definer set search_path=''
as $$
declare uid uuid:=(select auth.uid()); plan_limit integer; used integer;
begin
  if uid is null or new.created_by<>uid then raise exception 'Tournament creator does not match authenticated user.'; end if;
  if new.organization_id is null then raise exception 'Tournament workspace is required.'; end if;
  if coalesce(new.quota_exempt,false) then raise exception 'Quota-exempt tournaments are not allowed for normal operators.'; end if;
  if not exists (
    select 1 from public.organization_members om
    join public.subscriptions s on s.organization_id=om.organization_id
    join public.subscription_plans sp on sp.id=s.plan_id
    where om.organization_id=new.organization_id and om.user_id=uid and om.role in ('OWNER','OPERATOR')
      and s.status='ACTIVE' and s.expires_at>now() and sp.enabled=true
  ) then raise exception 'No active operator subscription is available for this workspace.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text,0));

  select s.included_tournaments+s.addon_tournaments into plan_limit
  from public.subscriptions s join public.subscription_plans sp on sp.id=s.plan_id
  where s.organization_id=new.organization_id and s.status='ACTIVE' and s.expires_at>now() and sp.enabled=true
  order by s.expires_at desc limit 1;

  select count(*)::integer into used from public.tournaments t
  where t.organization_id=new.organization_id and t.quota_exempt=false;

  if coalesce(used,0)>=coalesce(plan_limit,0) then raise exception 'Tournament quota has been reached.'; end if;
  if not private.design_available_for_org(new.design_id,new.organization_id)
    then raise exception 'Selected broadcast design package is not available for this workspace.'; end if;
  return new;
end;
$$;

drop policy if exists tournaments_manage_insert on public.tournaments;
create policy tournaments_manage_insert on public.tournaments for insert to authenticated
with check (private.can_insert_tournament(organization_id,created_by,design_id,quota_exempt));

update public.broadcast_designs
set config=jsonb_set(
  jsonb_set(config,'{stageDefaults,MATCH_REVIEW,background}','"TRANSPARENT"'::jsonb,true),
  '{stageDefaults,MATCH_REVIEW,panel}','"HUD"'::jsonb,true
)
where design_type='CUSTOM'
and (config #>> '{stageDefaults,MATCH_REVIEW,background}' is distinct from 'TRANSPARENT'
  or config #>> '{stageDefaults,MATCH_REVIEW,panel}' is distinct from 'HUD');

create or replace function private.enforce_match_input_mode()
returns trigger language plpgsql security definer set search_path=''
as $$
declare org_id uuid; entitled text;
begin
  select t.organization_id into org_id from public.tournaments t where t.id=new.tournament_id;
  if org_id is null then raise exception 'Match tournament does not exist.'; end if;
  if tg_op='UPDATE' then
    if new.input_mode is distinct from old.input_mode then
      raise exception 'Match input mode is immutable after match creation.';
    end if;
    return new;
  end if;
  select case when s.plan_id='PRO' and s.status='ACTIVE' and s.expires_at>now() and sp.enabled
              then 'OCR' else 'MANUAL' end into entitled
  from public.subscriptions s join public.subscription_plans sp on sp.id=s.plan_id
  where s.organization_id=org_id and s.status='ACTIVE' and s.expires_at>now() and sp.enabled=true
  order by s.expires_at desc limit 1;
  new.input_mode=coalesce(entitled,'MANUAL');
  return new;
end;
$$;
revoke execute on function private.enforce_match_input_mode() from public,anon,authenticated;
drop trigger if exists enforce_match_input_mode on public.matches;
create trigger enforce_match_input_mode before insert or update of input_mode on public.matches
for each row execute function private.enforce_match_input_mode();

create or replace function public.approve_detected_scoring_event(p_event_id uuid)
returns public.scoring_events language plpgsql security definer set search_path=''
as $$
declare event_row public.scoring_events; payload jsonb; killer_team_id uuid; player_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select se.* into event_row
  from public.scoring_events se
  join public.matches m on m.id=se.match_id
  join public.tournaments t on t.id=m.tournament_id
  join public.organization_members om on om.organization_id=t.organization_id
    and om.user_id=(select auth.uid()) and om.role in ('OWNER','OPERATOR')
  where se.id=p_event_id for update;
  if not found then raise exception 'Scoring event not found or access denied'; end if;
  if event_row.status not in ('DETECTED','VALIDATED') then raise exception 'Only detected/validated events can be approved'; end if;
  payload=coalesce(event_row.payload,'{}'::jsonb);

  if event_row.event_type='KILL_EVENT' then
    killer_team_id=coalesce(event_row.team_id,nullif(payload->>'killerTeamId','')::uuid);
    if killer_team_id is null then raise exception 'Detected kill event is missing its killer team.'; end if;
    update public.match_team_state
    set kills=kills+1,kill_points=kill_points+1,total_points=total_points+1,updated_at=now()
    where match_id=event_row.match_id and team_id=killer_team_id;
    if not found then raise exception 'Match team state not found for detected kill event.'; end if;
  elsif event_row.event_type='PLAYER_CHANGED' then
    player_id=nullif(payload->>'playerId','')::uuid;
    if player_id is null then raise exception 'Detected player event is missing its player id.'; end if;
    update public.match_team_state set current_player_id=player_id,updated_at=now()
    where match_id=event_row.match_id and team_id=event_row.team_id;
    if not found then raise exception 'Match team state not found for detected player event.'; end if;
  end if;

  update public.scoring_events set status='OFFICIAL',validated_at=now(),validated_by=(select auth.uid())
  where id=p_event_id returning * into event_row;
  return event_row;
end;
$$;
revoke execute on function public.approve_detected_scoring_event(uuid) from public,anon;
grant execute on function public.approve_detected_scoring_event(uuid) to authenticated;

create or replace function public.get_public_broadcast_snapshot(p_tournament_id uuid,p_token text,p_match_number integer default 1)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_tournament jsonb;v_match jsonb;v_teams jsonb;v_scores jsonb;v_overall jsonb;v_design jsonb;v_session jsonb;
begin
  if p_tournament_id is null or coalesce(p_token,'')='' or not exists (
    select 1 from public.broadcast_tokens bt where bt.tournament_id=p_tournament_id
      and bt.token_hash=extensions.digest(p_token,'sha256')
      and (bt.expires_at is null or bt.expires_at>now())
  ) then raise exception 'Invalid or expired broadcast token'; end if;

  select jsonb_build_object('name',t.name,'total_matches',t.total_matches,'design_id',t.design_id,'design_version',t.design_version)
  into v_tournament from public.tournaments t where t.id=p_tournament_id;
  if v_tournament is null then raise exception 'Tournament not found'; end if;

  select jsonb_build_object('state',s.state,'state_payload',s.state_payload,'updated_at',s.updated_at)
  into v_session from public.broadcast_sessions s where s.tournament_id=p_tournament_id order by s.created_at desc limit 1;
  select jsonb_build_object('id',m.id,'match_number',m.match_number) into v_match from public.matches m
  where m.tournament_id=p_tournament_id and m.match_number=greatest(coalesce(p_match_number,1),1) limit 1;

  if v_match is not null then
    select coalesce(jsonb_agg(jsonb_build_object('team_id',mts.team_id,'kills',mts.kills,'placement',mts.placement,'kill_points',mts.kill_points,'position_points',mts.position_points,'total_points',mts.total_points,'elimination_status',mts.elimination_status)),'[]'::jsonb)
    into v_scores from public.match_team_state mts where mts.match_id=(v_match->>'id')::uuid;
  else v_scores='[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object('team_id',t.id,'team_number',t.team_number,'team_name',t.team_name,'team_prefix',t.team_prefix,'kills',coalesce(totals.kills,0),'total_points',coalesce(totals.points,0)) order by t.team_number),'[]'::jsonb)
  into v_overall from public.teams t left join (
    select mts.team_id,sum(mts.kills)::integer kills,sum(mts.total_points)::integer points
    from public.match_team_state mts join public.matches m on m.id=mts.match_id
    where m.tournament_id=p_tournament_id group by mts.team_id
  ) totals on totals.team_id=t.id
  where t.tournament_id=p_tournament_id and t.is_active=true;

  if (v_tournament->>'design_id') is not null then
    select jsonb_build_object('version',coalesce((t.design_snapshot->>'version')::integer,d.version),'config',coalesce(t.design_snapshot->'config',d.config),'assets',coalesce(t.design_snapshot->'assets','[]'::jsonb))
    into v_design from public.tournaments t join public.broadcast_designs d on d.id=t.design_id where t.id=p_tournament_id;
  end if;

  return jsonb_build_object('tournament',v_tournament,'session',coalesce(v_session,'{}'::jsonb),'match',coalesce(v_match,'{}'::jsonb),'teams',v_teams,'scores',v_scores,'overall',v_overall,'design',coalesce(v_design,'{}'::jsonb));
end;
$$;
revoke execute on function public.get_public_broadcast_snapshot(uuid,text,integer) from public;
grant execute on function public.get_public_broadcast_snapshot(uuid,text,integer) to anon,authenticated;

update public.tournaments t
set design_version=(private.snapshot_broadcast_design(t.design_id)->>'version')::integer,
    design_snapshot=private.snapshot_broadcast_design(t.design_id)
where t.design_id is not null
  and private.snapshot_broadcast_design(t.design_id) is not null;
