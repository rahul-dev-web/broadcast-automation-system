import { supabase } from "@/lib/supabase/client";
import { isPresentationPointTableVisible } from "@/lib/scoring";

export interface OverallTeam {
  teamId: string;
  teamNumber: number;
  teamName: string;
  teamPrefix: string;
  matchesPlayed: number;
  matchPoints: number[];
  totalPoints: number;
  totalKills: number;
}

export interface OverallData {
  tournamentId: string;
  tournamentName: string;
  totalMatches: number;
  ptMode: "PER_MATCH" | "OVERALL_ONLY" | "CUSTOM";
  selectedPtMatches: number[];
  teams: OverallTeam[];
}

export async function getOverallData(tournamentId: string): Promise<OverallData> {
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id, name, total_matches, pt_mode, selected_pt_matches")
    .eq("id", tournamentId)
    .single();
  if (tournamentError) throw tournamentError;

  const { data: teams, error: teamError } = await supabase
    .from("teams")
    .select("id, team_number, team_name, team_prefix")
    .eq("tournament_id", tournamentId)
    .eq("is_active", true)
    .order("team_number");
  if (teamError) throw teamError;

  const { data: matches, error: matchError } = await supabase
    .from("matches")
    .select("id, match_number, status")
    .eq("tournament_id", tournamentId)
    .eq("status", "VERIFIED")
    .order("match_number");
  if (matchError) throw matchError;

  const matchIds = (matches ?? []).map((m) => m.id);
  const { data: states, error: stateError } = matchIds.length
    ? await supabase
        .from("match_team_state")
        .select("match_id, team_id, total_points, kills")
        .in("match_id", matchIds)
    : { data: [], error: null };
  if (stateError) throw stateError;

  const matchNumberById = new Map((matches ?? []).map((m) => [m.id, Number(m.match_number)]));
  const stateByTeam = new Map<string, Map<number, { points: number; kills: number }>>();

  for (const row of states ?? []) {
    const matchNumber = matchNumberById.get(row.match_id);
    if (!matchNumber) continue;
    if (!stateByTeam.has(row.team_id)) stateByTeam.set(row.team_id, new Map());
    stateByTeam.get(row.team_id)!.set(matchNumber, {
      points: Number(row.total_points ?? 0),
      kills: Number(row.kills ?? 0),
    });
  }

  const result = (teams ?? []).map((team) => {
    const matchMap = stateByTeam.get(team.id) ?? new Map();
    const matchPoints = Array.from({ length: Number(tournament.total_matches) }, (_, i) => {
      const matchNumber = i + 1;
      return matchMap.get(matchNumber)?.points ?? 0;
    });
    return {
      teamId: team.id,
      teamNumber: Number(team.team_number),
      teamName: String(team.team_name ?? ""),
      teamPrefix: String(team.team_prefix ?? ""),
      matchesPlayed: matchMap.size,
      matchPoints,
      totalPoints: matchPoints.reduce((sum, value) => sum + value, 0),
      totalKills: Array.from(matchMap.values()).reduce((sum, value) => sum + value.kills, 0),
    };
  });

  result.sort((a, b) => b.totalPoints - a.totalPoints || b.totalKills - a.totalKills || a.teamNumber - b.teamNumber);

  return {
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    totalMatches: Number(tournament.total_matches),
    ptMode: tournament.pt_mode,
    selectedPtMatches: (tournament.selected_pt_matches ?? []).map(Number),
    teams: result,
  };
}

export function shouldShowMatchPt(
  data: Pick<OverallData, "ptMode" | "selectedPtMatches">,
  matchNumber: number,
) {
  return isPresentationPointTableVisible(data.ptMode, matchNumber, data.selectedPtMatches);
}
