-- Validate OCR team/player mapping before any scoring state mutation.
create or replace function private.apply_local_ocr_event(
  p_match_id uuid,p_team_id uuid,p_event_type text,p_payload jsonb,
  p_confidence numeric,p_fingerprint text,p_detected_at timestamptz default now()
) returns public.scoring_events language plpgsql security definer set search_path=''
as $$
declare v_event public.scoring_events;v_conf numeric:=greatest(0,least(1,coalesce(p_confidence,0)));
v_recent_kills integer:=0;v_status text:='DETECTED';v_player_id uuid;v_killer_team uuid;
begin
 if p_event_type not in ('PLAYER_CHANGED','KILL_EVENT') then raise exception 'Unsupported OCR scoring event type.'; end if;
 if not exists(select 1 from public.match_team_state where match_id=p_match_id and team_id=p_team_id) then raise exception 'OCR event team is not part of this match.'; end if;
 if p_fingerprint is not null then
   select * into v_event from public.scoring_events where match_id=p_match_id and fingerprint=p_fingerprint limit 1;
   if found then return v_event; end if;
 end if;
 if p_event_type='PLAYER_CHANGED' then
   v_player_id=nullif(p_payload->>'playerId','')::uuid;
   if v_player_id is null or p_team_id is null then raise exception 'Player-change OCR event is missing player/team mapping.'; end if;
   if not exists(select 1 from public.players where id=v_player_id and team_id=p_team_id) then raise exception 'Player does not belong to OCR event team.'; end if;
   update public.match_team_state set current_player_id=v_player_id,updated_at=now() where match_id=p_match_id and team_id=p_team_id;
   insert into public.scoring_events(match_id,team_id,event_type,status,source,fingerprint,detected_at,validated_at,payload)
   values(p_match_id,p_team_id,'PLAYER_CHANGED','OFFICIAL','LOCAL_OCR',p_fingerprint,p_detected_at,now(),jsonb_set(coalesce(p_payload,'{}'::jsonb),'{"confidence"}',to_jsonb(v_conf),true))
   returning * into v_event;
   return v_event;
 end if;
 if coalesce(lower(p_payload->>'result'),'kill')<>'kill' then raise exception 'Only confirmed kills can be scored; knockdowns are not kill events.'; end if;
 select count(*)::integer into v_recent_kills from public.scoring_events
 where match_id=p_match_id and event_type='KILL_EVENT' and source='LOCAL_OCR' and created_at>now()-interval '5 seconds';
 if v_conf>=0.90 and v_recent_kills<2 then v_status='OFFICIAL'; end if;
 v_killer_team=coalesce(p_team_id,nullif(p_payload->>'killerTeamId','')::uuid);
 if v_killer_team is null then raise exception 'Kill event is missing killer team.'; end if;
 if v_killer_team<>p_team_id then raise exception 'Killer team mapping mismatch.'; end if;
 insert into public.scoring_events(match_id,team_id,event_type,status,source,fingerprint,detected_at,validated_at,payload)
 values(p_match_id,v_killer_team,'KILL_EVENT',v_status,'LOCAL_OCR',p_fingerprint,p_detected_at,case when v_status='OFFICIAL' then now() else null end,jsonb_set(coalesce(p_payload,'{}'::jsonb),'{"confidence"}',to_jsonb(v_conf),true))
 returning * into v_event;
 if v_status='OFFICIAL' then
   update public.match_team_state set kills=kills+1,kill_points=kill_points+1,total_points=total_points+1,updated_at=now() where match_id=p_match_id and team_id=v_killer_team;
 end if;
 return v_event;
end;
$$;
revoke all on function private.apply_local_ocr_event(uuid,uuid,text,jsonb,numeric,text,timestamptz) from public,anon,authenticated;
grant execute on function private.apply_local_ocr_event(uuid,uuid,text,jsonb,numeric,text,timestamptz) to service_role;
