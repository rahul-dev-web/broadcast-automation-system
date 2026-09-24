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

export function calculateMatchPoints(kills: number, placement: number) {
  const safeKills = Math.max(0, Math.floor(kills));
  const positionPoints = POSITION_POINTS[placement] ?? 0;

  return {
    killPoints: safeKills,
    positionPoints,
    totalPoints: safeKills + positionPoints,
  };
}

export function getPlacementOrderFromEliminations(
  eliminatedTeamIds: string[],
  remainingTeamIds: string[],
): Record<string, number> {
  const result: Record<string, number> = {};

  eliminatedTeamIds.forEach((teamId, index) => {
    result[teamId] = 12 - index;
  });

  remainingTeamIds.forEach((teamId, index) => {
    result[teamId] = remainingTeamIds.length - index;
  });

  return result;
}
