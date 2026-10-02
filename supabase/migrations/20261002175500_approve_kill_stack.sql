-- Approve the pending OCR kill stack atomically for an operator.
create or replace function public.approve_detected_kill_events(p_match_id uuid)
returns integer language plpgsql security definer set search_path=''
as $$
declare e public.scoring_events; approved integer:=0; killer_team uuid; payload jsonb;
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 if not exists (
   select 1 from public.matches m join public.tournaments t on t.id=m.tournament_id
   join public.organization_members om on om.organization_id=t.organization_id
   where m.id=p_match_id and om.user_id=(select auth.uid()) and om.role in ('OWNER','OPERATOR')
 ) then raise exception 'Operator access required'; end if;
 for e in
   select se.* from public.scoring_events se
   where se.match_id=p_match_id and se.event_type='KILL_EVENT' and se.status in ('DETECTED','VALIDATED')
   order by se.created_at,se.id for update
 loop
   payload:=coalesce(e.payload,'{}'::jsonb);
   killer_team:=coalesce(e.team_id,nullif(payload->>'killerTeamId','')::uuid);
   if killer_team is null then raise exception 'Pending kill event is missing killer team.'; end if;
   update public.match_team_state set kills=kills+1,kill_points=kill_points+1,total_points=total_points+1,updated_at=now()
   where match_id=p_match_id and team_id=killer_team;
   if not found then raise exception 'Match team state not found for pending kill.'; end if;
   update public.scoring_events set status='OFFICIAL',validated_at=now(),validated_by=(select auth.uid()) where id=e.id;
   approved:=approved+1;
 end loop;
 return approved;
end;
$$;
revoke execute on function public.approve_detected_kill_events(uuid) from public,anon;
grant execute on function public.approve_detected_kill_events(uuid) to authenticated;
