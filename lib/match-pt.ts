import { supabase } from "@/lib/supabase/client";
import { calculateMatchPoints, isPresentationPointTableVisible } from "@/lib/scoring";

export interface MatchPtRow {
  teamId: string;
  teamNumber: number;
  teamName: string;
  teamPrefix: string;
  kills: number;
  placement: number | null;
  totalPoints: number;
}

export interface MatchPtData {
  tournamentId: string;
  tournamentName: string;
  matchNumber: number;
  ptMode: "PER_MATCH" | "OVERALL_ONLY" | "CUSTOM";
  selectedPtMatches: number[];
  matchStatus: "PENDING" | "LIVE" | "REVIEW" | "VERIFIED";
  rows: MatchPtRow[];
}

export async function getMatchPtData(tournamentId: string, matchNumber: number): Promise<MatchPtData> {
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id, name, pt_mode, selected_pt_matches")
    .eq("id", tournamentId)
    .single();
  if (tournamentError) throw tournamentError;

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, match_number, status")
    .eq("tournament_id", tournamentId)
    .eq("match_number", matchNumber)
    .single();
  if (matchError) throw matchError;

  if (match.status !== "VERIFIED") {
    throw new Error("Match PT is available only after the match is verified.");
  }

  const selectedPtMatches = (tournament.selected_pt_matches ?? []).map(Number);
  if (!isPresentationPointTableVisible(tournament.pt_mode, matchNumber, selectedPtMatches)) {
    throw new Error("PT presentation is disabled for this match by the tournament PT mode.");
  }

  const { data: states, error: stateError } = await supabase
    .from("match_team_state")
    .select("team_id, kills, placement, total_points, teams!inner(team_number, team_name, team_prefix)")
    .eq("match_id", match.id);
  if (stateError) throw stateError;

  const rows = (states ?? []).map((row: any) => {
    const kills = Number(row.kills ?? 0);
    const placement = row.placement == null ? null : Number(row.placement);
    return {
      teamId: String(row.team_id),
      teamNumber: Number(row.teams.team_number),
      teamName: String(row.teams.team_name ?? ""),
      teamPrefix: String(row.teams.team_prefix ?? ""),
      kills,
      placement,
      totalPoints: Number(row.total_points ?? calculateMatchPoints(kills, placement).totalPoints),
    };
  }).sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));

  return {
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    matchNumber: Number(match.match_number),
    ptMode: tournament.pt_mode,
    selectedPtMatches,
    matchStatus: match.status,
    rows,
  };
}
