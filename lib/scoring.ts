export const POSITION_POINTS: Record<number, number> = {
  1: 12,
  2: 9,
  3: 8,
  4: 7,
  5: 6,
  6: 5,
  7: 4,
  8: 3,
  9: 2,
  10: 1,
  11: 0,
  12: 0,
};

export function calculateMatchPoints(kills: number, placement: number | null) {
  const safeKills = Math.max(0, Math.floor(kills));
  const positionPoints = placement === null ? 0 : POSITION_POINTS[placement] ?? 0;

  return {
    killPoints: safeKills,
    positionPoints,
    totalPoints: safeKills + positionPoints,
  };
}

/**
 * Derive placements from the order in which active teams are eliminated.
 * The last remaining team is 1st. This works for tournaments with fewer than 12 active teams.
 */
export function getPlacementOrderFromEliminationOrder(
  eliminatedTeamIds: string[],
  winnerTeamId: string,
  activeTeamCount: number = eliminatedTeamIds.length + 1,
): Record<string, number> {
  const teamCount = Math.max(1, Math.min(12, activeTeamCount));
  const result: Record<string, number> = {};

  eliminatedTeamIds.forEach((teamId, index) => {
    result[teamId] = teamCount - index;
  });

  result[winnerTeamId] = 1;
  return result;
}

export function isPresentationPointTableVisible(
  mode: "PER_MATCH" | "OVERALL_ONLY" | "CUSTOM",
  matchNumber: number,
  customMatches: number[],
) {
  if (mode === "PER_MATCH") return true;
  if (mode === "OVERALL_ONLY") return false;
  return customMatches.includes(matchNumber);
}
