import { supabase } from "@/lib/supabase/client";
import { calculateMatchPoints } from "@/lib/scoring";
import { openMatchLiveStage, openMatchReviewStage } from "@/lib/broadcast-controller";

export interface MatchConsoleTeam {
  id: string;
  teamNumber: number;
  teamName: string;
  teamPrefix: string;
  logoUrl: string | null;
  kills: number;
  placement: number | null;
  killPoints: number;
  positionPoints: number;
  totalPoints: number;
  eliminationStatus: "ALIVE" | "ELIMINATED";
}

export interface MatchConsoleData {
  tournamentId: string;
  tournamentName: string;
  matchId: string;
  matchNumber: number;
  totalMatches: number;
  matchStatus: "PENDING" | "LIVE" | "REVIEW" | "VERIFIED";
  inputMode: "MANUAL" | "OCR";
  teams: MatchConsoleTeam[];
}

export async function getMatchConsoleData(tournamentId: string, matchNumber: number): Promise<MatchConsoleData> {
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id, name, total_matches")
    .eq("id", tournamentId)
    .single();

  if (tournamentError) throw tournamentError;

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, tournament_id, match_number, status, input_mode")
    .eq("tournament_id", tournamentId)
    .eq("match_number", matchNumber)
    .single();

  if (matchError) throw matchError;

  const { data: rows, error: stateError } = await supabase
    .from("match_team_state")
    .select("team_id, kills, placement, kill_points, position_points, total_points, elimination_status, teams!inner(team_number, team_name, team_prefix, logo_url)")
    .eq("match_id", match.id)
    .order("team_id");

  if (stateError) throw stateError;

  const teams = (rows ?? []).map((row: any) => ({
    id: row.team_id as string,
    teamNumber: row.teams.team_number as number,
    teamName: (row.teams.team_name ?? "") as string,
    teamPrefix: (row.teams.team_prefix ?? "") as string,
    logoUrl: (row.teams.logo_url ?? null) as string | null,
    kills: Number(row.kills ?? 0),
    placement: row.placement == null ? null : Number(row.placement),
    killPoints: Number(row.kill_points ?? 0),
    positionPoints: Number(row.position_points ?? 0),
    totalPoints: Number(row.total_points ?? 0),
    eliminationStatus: row.elimination_status as "ALIVE" | "ELIMINATED",
  })).sort((a, b) => a.teamNumber - b.teamNumber);

  return {
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    matchId: match.id,
    matchNumber: match.match_number,
    totalMatches: tournament.total_matches,
    matchStatus: match.status,
    inputMode: match.input_mode,
    teams,
  };
}

export async function startManualMatch(matchId: string) {
  const { data: current, error: currentError } = await supabase
    .from("matches")
    .select("status, tournament_id")
    .eq("id", matchId)
    .single();
  if (currentError) throw currentError;
  if (current.status !== "PENDING") throw new Error("Only a PENDING match can be started.");

  const { error } = await supabase.from("matches")
    .update({ status: "LIVE", input_mode: "MANUAL", started_at: new Date().toISOString() })
    .eq("id", matchId);
  if (error) throw error;
  const { data: match } = await supabase.from("matches").select("tournament_id, match_number").eq("id", matchId).single();
  if (!match) throw new Error("Match metadata could not be loaded.");
  await openMatchLiveStage(match.tournament_id, match.match_number, "MANUAL");
}

export async function setTeamKills(matchId: string, team: MatchConsoleTeam, nextKills: number) {
  if (team.eliminationStatus === "ELIMINATED") throw new Error("An eliminated team cannot receive more kills.");

  const kills = Math.max(0, Math.floor(nextKills));
  const points = calculateMatchPoints(kills, team.placement);

  const { error: stateError } = await supabase.from("match_team_state")
    .update({ kills, kill_points: points.killPoints, position_points: points.positionPoints, total_points: points.totalPoints })
    .eq("match_id", matchId).eq("team_id", team.id);
  if (stateError) throw stateError;

  const { error: eventError } = await supabase.from("scoring_events").insert({
    match_id: matchId,
    team_id: team.id,
    event_type: "KILL_COUNT_SET",
    payload: { previousKills: team.kills, kills },
    sequence_no: Date.now(),
  });
  if (eventError) throw eventError;
}

export async function eliminateTeam(match: MatchConsoleData, teamId: string) {
  const target = match.teams.find((team) => team.id === teamId);
  if (!target || target.eliminationStatus === "ELIMINATED") return;

  const activeTeams = match.teams.filter((team) => team.eliminationStatus === "ALIVE");
  const eliminatedBefore = match.teams
    .filter((team) => team.eliminationStatus === "ELIMINATED")
    .sort((a, b) => (b.placement ?? 0) - (a.placement ?? 0));

  const eliminationOrder = [...eliminatedBefore.map((team) => team.id), teamId];
  const remaining = activeTeams.filter((team) => team.id !== teamId);

  // Placement is derived from the teams actually participating in this match,
  // not from the global 12-team maximum. This keeps 6/8/10/11-team matches correct.
  const participatingTeamCount = activeTeams.length + eliminatedBefore.length;
  const targetPlacement = participatingTeamCount - eliminationOrder.length + 1;
  const targetPoints = calculateMatchPoints(target.kills, targetPlacement);

  const { error: stateError } = await supabase.from("match_team_state")
    .update({
      placement: targetPlacement,
      kill_points: targetPoints.killPoints,
      position_points: targetPoints.positionPoints,
      total_points: targetPoints.totalPoints,
      elimination_status: "ELIMINATED",
    })
    .eq("match_id", match.matchId).eq("team_id", teamId);
  if (stateError) throw stateError;

  const { error: eventError } = await supabase.from("scoring_events").insert({
    match_id: match.matchId,
    team_id: teamId,
    event_type: "TEAM_ELIMINATED",
    payload: { placement: targetPlacement, eliminationOrder },
    sequence_no: Date.now(),
  });
  if (eventError) throw eventError;

  if (remaining.length === 1) {
    const winner = remaining[0];
    const winnerPoints = calculateMatchPoints(winner.kills, 1);
    const { error: winnerError } = await supabase.from("match_team_state")
      .update({ placement: 1, kill_points: winnerPoints.killPoints, position_points: winnerPoints.positionPoints, total_points: winnerPoints.totalPoints })
      .eq("match_id", match.matchId).eq("team_id", winner.id);
    if (winnerError) throw winnerError;
  }
}

export async function finishManualMatch(matchId: string) {
  const { data: alive, error: aliveError } = await supabase.from("match_team_state")
    .select("team_id, kills").eq("match_id", matchId).eq("elimination_status", "ALIVE");
  if (aliveError) throw aliveError;
  if ((alive ?? []).length !== 1) {
    throw new Error("Eliminate all teams except the final surviving team before ending the match.");
  }

  const winner = alive![0];
  const winnerPoints = calculateMatchPoints(Number(winner.kills ?? 0), 1);
  const { error: winnerError } = await supabase.from("match_team_state")
    .update({ placement: 1, kill_points: winnerPoints.killPoints, position_points: winnerPoints.positionPoints, total_points: winnerPoints.totalPoints })
    .eq("match_id", matchId).eq("team_id", winner.team_id);
  if (winnerError) throw winnerError;

  const { error } = await supabase.from("matches")
    .update({ status: "REVIEW", ended_at: new Date().toISOString() })
    .eq("id", matchId);
  if (error) throw error;
  const { data: match } = await supabase.from("matches").select("tournament_id, match_number").eq("id", matchId).single();
  if (match) {
    await supabase.from("tournaments").update({ status: "LIVE" }).eq("id", match.tournament_id);
    await openMatchReviewStage(match.tournament_id, match.match_number);
  }
}
