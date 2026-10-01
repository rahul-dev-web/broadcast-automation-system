alter table public.scoring_events
  add column if not exists status text not null default 'OFFICIAL' check (status in ('DETECTED','VALIDATED','OFFICIAL','REJECTED')),
  add column if not exists source text not null default 'MANUAL' check (source in ('MANUAL','LOCAL_OCR','CLOUD_OCR')),
  add column if not exists fingerprint text,
  add column if not exists detected_at timestamptz,
  add column if not exists validated_at timestamptz,
  add column if not exists validated_by uuid references auth.users(id) on delete set null;
create unique index if not exists scoring_events_match_fingerprint_uidx on public.scoring_events(match_id,fingerprint) where fingerprint is not null;
create index if not exists idx_scoring_events_match_status on public.scoring_events(match_id,status,created_at desc);
create index if not exists idx_scoring_events_match_source on public.scoring_events(match_id,source,created_at desc);
create index if not exists idx_scoring_events_validated_by on public.scoring_events(validated_by);
create or replace function public.approve_detected_scoring_event(p_event_id uuid) returns public.scoring_events language plpgsql security definer set search_path='' as $function$
declare event_row public.scoring_events;
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 select se.* into event_row from public.scoring_events se join public.matches m on m.id=se.match_id join public.tournaments t on t.id=m.tournament_id join public.organization_members om on om.organization_id=t.organization_id and om.user_id=(select auth.uid()) and om.role in ('OWNER','OPERATOR') where se.id=p_event_id for update;
 if not found then raise exception 'Scoring event not found or access denied'; end if;
 if event_row.status not in ('DETECTED','VALIDATED') then raise exception 'Only detected/validated events can be approved'; end if;
 update public.scoring_events set status='OFFICIAL',validated_at=now(),validated_by=(select auth.uid()) where id=p_event_id returning * into event_row;
 return event_row;
end;$function$;
revoke execute on function public.approve_detected_scoring_event(uuid) from public,anon;
grant execute on function public.approve_detected_scoring_event(uuid) to authenticated;