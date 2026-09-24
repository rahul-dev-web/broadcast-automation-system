import { supabase } from "@/lib/supabase/client";
import type { TournamentDraft } from "@/lib/types/tournament";

export async function createTournament(draft: TournamentDraft) {
  if (!draft.name.trim()) throw new Error("Tournament name is required.");
  if (draft.totalMatches < 1 || draft.totalMatches > 50) {
    throw new Error("Total matches must be between 1 and 50.");
  }
  if (draft.presentationMode === "CUSTOM" && draft.customMatches.length === 0) {
    throw new Error("Select at least one match for Custom PT mode.");
  }

  const activeTeams = draft.teams.filter(
    (team) => team.teamName.trim() || team.teamPrefix.trim(),
  );

  for (const team of activeTeams) {
    if (!team.teamName.trim()) throw new Error(`Team ${team.teamNumber}: team name is required.`);
    if (!team.teamPrefix.trim()) throw new Error(`Team ${team.teamNumber}: prefix is required.`);

    for (const player of team.players) {
      if (player.slotNumber === 5 && !player.isSubstitute) {
        throw new Error(`Team ${team.teamNumber}: Player 5 must be a substitute.`);
      }
      if (player.slotNumber <= 4 && player.isSubstitute) {
        throw new Error(`Team ${team.teamNumber}: Players 1–4 cannot be substitutes.`);
      }
    }
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .insert({
      name: draft.name.trim(),
      total_matches: draft.totalMatches,
      pt_mode: draft.presentationMode,
      selected_pt_matches:
        draft.presentationMode === "CUSTOM" ? draft.customMatches : [],
      status: "READY",
    })
    .select("id")
    .single();

  if (tournamentError) throw tournamentError;

  const { data: insertedTeams, error: teamsError } = await supabase
    .from("teams")
    .insert(
      activeTeams.map((team) => ({
        tournament_id: tournament.id,
        team_number: team.teamNumber,
        team_name: team.teamName.trim(),
        team_prefix: team.teamPrefix.trim().toUpperCase(),
        logo_url: team.logoUrl.trim() || null,
        is_active: true,
      })),
    )
    .select("id, team_number");

  if (teamsError) throw teamsError;

  const teamIdByNumber = new Map(
    (insertedTeams ?? []).map((team) => [team.team_number, team.id]),
  );

  const players = activeTeams.flatMap((team) =>
    team.players
      .filter((player) => player.displayName.trim() || player.inGameName.trim())
      .map((player) => ({
        team_id: teamIdByNumber.get(team.teamNumber)!,
        slot_number: player.slotNumber,
        display_name: player.displayName.trim() || null,
        in_game_name: player.inGameName.trim() || null,
        is_substitute: player.slotNumber === 5,
      })),
  );

  if (players.length) {
    const { error: playersError } = await supabase.from("players").insert(players);
    if (playersError) throw playersError;
  }

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .insert(
      Array.from({ length: draft.totalMatches }, (_, index) => ({
        tournament_id: tournament.id,
        match_number: index + 1,
        status: "PENDING",
        input_mode: "MANUAL",
      })),
    )
    .select("id, match_number");

  if (matchesError) throw matchesError;

  const matchTeamRows = (matches ?? []).flatMap((match) =>
    (insertedTeams ?? []).map((team) => ({
      match_id: match.id,
      team_id: team.id,
      kills: 0,
      placement: null,
      kill_points: 0,
      position_points: 0,
      total_points: 0,
      elimination_status: "ALIVE",
    })),
  );

  if (matchTeamRows.length) {
    const { error: stateError } = await supabase
      .from("match_team_state")
      .insert(matchTeamRows);
    if (stateError) throw stateError;
  }

  const { error: sessionError } = await supabase.from("broadcast_sessions").insert({
    tournament_id: tournament.id,
    state: "SETUP",
    state_payload: { matchNumber: 1 },
  });
  if (sessionError) throw sessionError;

  return tournament.id as string;
}
