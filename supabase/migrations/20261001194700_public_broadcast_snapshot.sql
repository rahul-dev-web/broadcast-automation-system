create or replace function public.get_public_broadcast_snapshot(
  p_tournament_id uuid,
  p_token text,
  p_match_number integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_tournament jsonb;
  v_match jsonb;
  v_teams jsonb;
  v_scores jsonb;
  v_overall jsonb;
  v_design jsonb;
  v_session jsonb;
begin
  if p_tournament_id is null
     or coalesce(p_token, '') = ''
     or not exists (
       select 1
       from public.broadcast_tokens bt
       where bt.tournament_id = p_tournament_id
         and bt.token_hash = extensions.digest(p_token, 'sha256')
     ) then
    raise exception 'Invalid broadcast token';
  end if;

  select jsonb_build_object('name', t.name, 'total_matches', t.total_matches, 'design_id', t.design_id)
  into v_tournament
  from public.tournaments t
  where t.id = p_tournament_id;

  if v_tournament is null then
    raise exception 'Tournament not found';
  end if;

  select jsonb_build_object('state', s.state, 'state_payload', s.state_payload, 'updated_at', s.updated_at)
  into v_session
  from public.broadcast_sessions s
  where s.tournament_id = p_tournament_id
  order by s.created_at desc
  limit 1;

  select jsonb_build_object('id', m.id, 'match_number', m.match_number)
  into v_match
  from public.matches m
  where m.tournament_id = p_tournament_id
    and m.match_number = greatest(coalesce(p_match_number, 1), 1)
  limit 1;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'team_number', t.team_number,
        'team_name', t.team_name,
        'team_prefix', t.team_prefix,
        'logo_url', t.logo_url,
        'players', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'slot_number', p.slot_number,
              'display_name', p.display_name,
              'in_game_name', p.in_game_name,
              'is_substitute', p.is_substitute
            ) order by p.slot_number
          )
          from public.players p
          where p.team_id = t.id
        ), '[]'::jsonb)
      )
      order by t.team_number
    ),
    '[]'::jsonb
  )
  into v_teams
  from public.teams t
  where t.tournament_id = p_tournament_id
    and t.is_active = true;

  if v_match is not null then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'team_id', mts.team_id,
          'kills', mts.kills,
          'placement', mts.placement,
          'kill_points', mts.kill_points,
          'position_points', mts.position_points,
          'total_points', mts.total_points,
          'elimination_status', mts.elimination_status
        )
      ),
      '[]'::jsonb
    )
    into v_scores
    from public.match_team_state mts
    where mts.match_id = (v_match->>'id')::uuid;
  else
    v_scores := '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'team_id', t.id,
        'team_number', t.team_number,
        'team_name', t.team_name,
        'team_prefix', t.team_prefix,
        'kills', coalesce(totals.kills, 0),
        'total_points', coalesce(totals.points, 0)
      )
      order by t.team_number
    ),
    '[]'::jsonb
  )
  into v_overall
  from public.teams t
  left join (
    select mts.team_id, sum(mts.kills)::integer as kills, sum(mts.total_points)::integer as points
    from public.match_team_state mts
    join public.matches m on m.id = mts.match_id
    where m.tournament_id = p_tournament_id
    group by mts.team_id
  ) totals on totals.team_id = t.id
  where t.tournament_id = p_tournament_id
    and t.is_active = true;

  if (v_tournament->>'design_id') is not null then
    select jsonb_build_object(
      'config', d.config,
      'assets', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'slot', a.slot,
            'storage_path', a.storage_path,
            'mime_type', a.mime_type,
            'config', a.config
          )
        )
        from public.broadcast_design_assets a
        where a.design_id = d.id
      ), '[]'::jsonb)
    )
    into v_design
    from public.broadcast_designs d
    where d.id = (v_tournament->>'design_id')::uuid;
  end if;

  return jsonb_build_object(
    'tournament', v_tournament,
    'session', coalesce(v_session, '{}'::jsonb),
    'match', coalesce(v_match, '{}'::jsonb),
    'teams', v_teams,
    'scores', v_scores,
    'overall', v_overall,
    'design', coalesce(v_design, '{}'::jsonb)
  );
end;
$function$;

revoke execute on function public.get_public_broadcast_snapshot(uuid, text, integer) from public;
grant execute on function public.get_public_broadcast_snapshot(uuid, text, integer) to anon, authenticated;
