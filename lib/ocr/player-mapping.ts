export interface PlayerIdentity {
  id: string;
  teamId: string;
  teamNumber: number;
  registeredName: string;
  inGameName: string;
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function mapInGameNameToPlayer(
  detectedName: string,
  players: PlayerIdentity[],
): PlayerIdentity | null {
  const target = normalize(detectedName);
  if (!target) return null;

  return (
    players.find((player) => normalize(player.inGameName) === target) ?? null
  );
}
