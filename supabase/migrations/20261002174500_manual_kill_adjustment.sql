-- Operator-side +/- correction for match kill totals.
create or replace function public.adjust_match_team_kills(
  p_match_id uuid,p_team_id uuid,p_delta integer
)
returns public.match_team_state language plpgsql security definer set search_path=''
as $$
declare row public.match_team_state; delta integer:=greatest(-99,least(99,coalesce(p_delta,0)));
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 if delta=0 then raise exception 'Kill adjustment must be non-zero'; end if;
 if not exists (
   select 1 from public.matches m join public.tournaments t on t.id=m.tournament_id
   join public.organization_members om on om.organization_id=t.organization_id
   where m.id=p_match_id and om.user_id=(select auth.uid()) and om.role in ('OWNER','OPERATOR')
 ) then raise exception 'Operator access required'; end if;
 update public.match_team_state
 set kills=greatest(0,kills+delta),kill_points=greatest(0,kill_points+delta),
     total_points=greatest(0,total_points+delta),updated_at=now()
 where match_id=p_match_id and team_id=p_team_id
 returning * into row;
 if not found then raise exception 'Match team state not found'; end if;
 return row;
end;
$$;
revoke execute on function public.adjust_match_team_kills(uuid,uuid,integer) from public,anon;
grant execute on function public.adjust_match_team_kills(uuid,uuid,integer) to authenticated;
