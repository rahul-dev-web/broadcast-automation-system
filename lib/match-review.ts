import { supabase } from "@/lib/supabase/client";
import { calculateMatchPoints } from "@/lib/scoring";
import { openMatchVerifiedStage } from "@/lib/broadcast-controller";

export interface MatchReviewTeam {
  id: string;
  teamNumber: number;
  teamName: string;
  teamPrefix: string;
  kills: number;
  placement: number | null;
  killPoints: number;
  positionPoints: number;
  totalPoints: number;
  eliminationStatus: "ALIVE" | "ELIMINATED";
}

export interface MatchReviewData {
  tournamentId: string;
  tournamentName: string;
  matchId: string;
  matchNumber: number;
  totalMatches: number;
  matchStatus: "PENDING" | "LIVE" | "REVIEW" | "VERIFIED";
  inputMode: "MANUAL" | "OCR";
  teams: MatchReviewTeam[];
  officialResultExists: boolean;
}

export async function getMatchReviewData(tournamentId: string, matchNumber: number): Promise<MatchReviewData> {
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id, name, total_matches")
    .eq("id", tournamentId)
    .single();
  if (tournamentError) throw tournamentError;

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, match_number, status, input_mode")
    .eq("tournament_id", tournamentId)
    .eq("match_number", matchNumber)
    .single();
  if (matchError) throw matchError;

  const { data: rows, error: stateError } = await supabase
    .from("match_team_state")
    .select("team_id, kills, placement, kill_points, position_points, total_points, elimination_status, teams!inner(team_number, team_name, team_prefix)")
    .eq("match_id", match.id)
    .order("team_id");
  if (stateError) throw stateError;

  const { data: official, error: officialError } = await supabase
    .from("match_results")
    .select("id")
    .eq("match_id", match.id)
    .maybeSingle();
  if (officialError) throw officialError;

  const teams = (rows ?? []).map((row: any) => ({
    id: row.team_id as string,
    teamNumber: Number(row.teams.team_number),
    teamName: String(row.teams.team_name ?? ""),
    teamPrefix: String(row.teams.team_prefix ?? ""),
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
    matchNumber: Number(match.match_number),
    totalMatches: Number(tournament.total_matches),
    matchStatus: match.status,
    inputMode: match.input_mode,
    teams,
    officialResultExists: Boolean(official),
  };
}

export async function updateReviewKills(matchId: string, team: MatchReviewTeam, nextKills: number) {
  if (team.eliminationStatus === "ELIMINATED" && team.placement == null) {
    throw new Error("Cannot review a team without a placement.");
  }

  const kills = Math.max(0, Math.floor(nextKills));
  const points = calculateMatchPoints(kills, team.placement);

  const { error } = await supabase
    .from("match_team_state")
    .update({
      kills,
      kill_points: points.killPoints,
      position_points: points.positionPoints,
      total_points: points.totalPoints,
    })
    .eq("match_id", matchId)
    .eq("team_id", team.id);

  if (error) throw error;
}

export async function verifyMatchResult(review: MatchReviewData) {
  if (review.matchStatus !== "REVIEW") {
    throw new Error("Only a match in REVIEW can be verified.");
  }

  const invalid = review.teams.some((team) => team.placement == null);
  if (invalid) throw new Error("Every active team must have a final placement before verification.");

  const placements = review.teams.map((team) => team.placement as number);
  const uniquePlacements = new Set(placements);
  if (uniquePlacements.size !== placements.length) {
    throw new Error("Duplicate placements detected. Review the match before verifying.");
  }

  const { data: states, error: stateError } = await supabase
    .from("match_team_state")
    .select("team_id, kills, placement, kill_points, position_points, total_points, elimination_status")
    .eq("match_id", review.matchId);
  if (stateError) throw stateError;

  const resultData = (states ?? [])
    .map((state: any) => ({
      teamId: state.team_id,
      kills: Number(state.kills ?? 0),
      placement: state.placement == null ? null : Number(state.placement),
      killPoints: Number(state.kill_points ?? 0),
      positionPoints: Number(state.position_points ?? 0),
      totalPoints: Number(state.total_points ?? 0),
      eliminationStatus: state.elimination_status,
    }))
    .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));

  const verifiedAt = new Date().toISOString();

  const { error: resultError } = await supabase
    .from("match_results")
    .upsert({
      match_id: review.matchId,
      result_data: {
        source: review.inputMode,
        teams: resultData,
        verifiedAt,
      },
      verified_by: "operator",
      verified_at: verifiedAt,
    }, { onConflict: "match_id" });
  if (resultError) throw resultError;

  const { error: matchError } = await supabase
    .from("matches")
    .update({ status: "VERIFIED", verified_at: verifiedAt })
    .eq("id", review.matchId);
  if (matchError) throw matchError;

  const { error: eventError } = await supabase.from("scoring_events").insert({
    match_id: review.matchId,
    event_type: "MATCH_VERIFIED",
    payload: { source: review.inputMode, verifiedAt },
    sequence_no: Date.now(),
  });
  if (eventError) throw eventError;
  await openMatchVerifiedStage(review.tournamentId, review.matchNumber);
}
