-- Match Review is an opaque reveal scene; gameplay remains transparent only in Match Live.
update public.broadcast_designs
set config=jsonb_set(
  jsonb_set(config,'{stageDefaults,MATCH_REVIEW,background}','"FULL"'::jsonb,true),
  '{stageDefaults,MATCH_REVIEW,panel}','"CLEAN"'::jsonb,true
);

-- OCR event semantics:
-- PLAYER_CHANGED is immediately official.
-- KILL_EVENT is auto-official only for high-confidence isolated kills;
-- stacked/low-confidence kills stay DETECTED for operator approval.
-- Knockdowns are never scoreable.
alter table public.scoring_events
  drop constraint if exists scoring_events_event_type_check;

create or replace function private.apply_local_ocr_event(
  p_match_id uuid,p_team_id uuid,p_event_type text,p_payload jsonb,
  p_confidence numeric,p_fingerprint text,p_detected_at timestamptz default now()
) returns public.scoring_events language plpgsql security definer set search_path=''
as $$
declare v_event public.scoring_events; v_conf numeric:=greatest(0,least(1,coalesce(p_confidence,0)));
v_recent_kills integer:=0; v_status text:='DETECTED'; v_player_id uuid; v_killer_team uuid;
begin
 if p_event_type not in ('PLAYER_CHANGED','KILL_EVENT') then raise exception 'Unsupported OCR scoring event type.'; end if;
 if p_fingerprint is not null then
   select * into v_event from public.scoring_events where match_id=p_match_id and fingerprint=p_fingerprint limit 1;
   if found then return v_event; end if;
 end if;
 if p_event_type='PLAYER_CHANGED' then
   v_player_id=nullif(p_payload->>'playerId','')::uuid;
   if v_player_id is null or p_team_id is null then raise exception 'Player-change OCR event is missing player/team mapping.'; end if;
   update public.match_team_state set current_player_id=v_player_id,updated_at=now()
   where match_id=p_match_id and team_id=p_team_id;
   if not found then raise exception 'Match team state not found for player-change event.'; end if;
   insert into public.scoring_events(match_id,team_id,event_type,status,source,fingerprint,detected_at,validated_at,payload)
   values(p_match_id,p_team_id,'PLAYER_CHANGED','OFFICIAL','LOCAL_OCR',p_fingerprint,p_detected_at,now(),
     jsonb_set(coalesce(p_payload,'{}'::jsonb),'{"confidence"}',to_jsonb(v_conf),true))
   returning * into v_event;
   return v_event;
 end if;
 if coalesce(lower(p_payload->>'result'),'kill')<>'kill' then raise exception 'Only confirmed kills can be scored; knockdowns are not kill events.'; end if;
 select count(*)::integer into v_recent_kills from public.scoring_events
 where match_id=p_match_id and event_type='KILL_EVENT' and source='LOCAL_OCR' and created_at>now()-interval '5 seconds';
 if v_conf>=0.90 and v_recent_kills<2 then v_status='OFFICIAL'; end if;
 v_killer_team=coalesce(p_team_id,nullif(p_payload->>'killerTeamId','')::uuid);
 if v_killer_team is null then raise exception 'Kill event is missing killer team.'; end if;
 insert into public.scoring_events(match_id,team_id,event_type,status,source,fingerprint,detected_at,validated_at,payload)
 values(p_match_id,v_killer_team,'KILL_EVENT',v_status,'LOCAL_OCR',p_fingerprint,p_detected_at,
   case when v_status='OFFICIAL' then now() else null end,
   jsonb_set(coalesce(p_payload,'{}'::jsonb),'{"confidence"}',to_jsonb(v_conf),true))
 returning * into v_event;
 if v_status='OFFICIAL' then
   update public.match_team_state set kills=kills+1,kill_points=kill_points+1,total_points=total_points+1,updated_at=now()
   where match_id=p_match_id and team_id=v_killer_team;
   if not found then raise exception 'Match team state not found for OCR kill.'; end if;
 end if;
 return v_event;
end;
$$;
revoke all on function private.apply_local_ocr_event(uuid,uuid,text,jsonb,numeric,text,timestamptz) from public,anon,authenticated;
grant execute on function private.apply_local_ocr_event(uuid,uuid,text,jsonb,numeric,text,timestamptz) to service_role;

create or replace function public.ingest_local_ocr_event(
 p_match_id uuid,p_team_id uuid,p_event_type text,p_payload jsonb,
 p_confidence numeric,p_fingerprint text,p_detected_at timestamptz default now()
) returns public.scoring_events language sql security definer set search_path=''
as $$ select private.apply_local_ocr_event(p_match_id,p_team_id,p_event_type,p_payload,p_confidence,p_fingerprint,p_detected_at); $$;
revoke all on function public.ingest_local_ocr_event(uuid,uuid,text,jsonb,numeric,text,timestamptz) from public,anon,authenticated;
grant execute on function public.ingest_local_ocr_event(uuid,uuid,text,jsonb,numeric,text,timestamptz) to service_role;

create or replace function public.approve_detected_scoring_event(p_event_id uuid)
returns public.scoring_events language plpgsql security definer set search_path=''
as $$
declare event_row public.scoring_events; payload jsonb; killer_team_id uuid; player_id uuid;
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 select se.* into event_row from public.scoring_events se
 join public.matches m on m.id=se.match_id join public.tournaments t on t.id=m.tournament_id
 join public.organization_members om on om.organization_id=t.organization_id and om.user_id=(select auth.uid()) and om.role in ('OWNER','OPERATOR')
 where se.id=p_event_id for update;
 if not found then raise exception 'Scoring event not found or access denied'; end if;
 if event_row.status not in ('DETECTED','VALIDATED') then raise exception 'Only pending OCR events can be approved'; end if;
 payload=coalesce(event_row.payload,'{}'::jsonb);
 if event_row.event_type='KILL_EVENT' then
   killer_team_id=coalesce(event_row.team_id,nullif(payload->>'killerTeamId','')::uuid);
   if killer_team_id is null then raise exception 'Detected kill event is missing its killer team.'; end if;
   update public.match_team_state set kills=kills+1,kill_points=kill_points+1,total_points=total_points+1,updated_at=now()
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
