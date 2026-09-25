"use client";

import { useEffect, useState } from "react";
import { getMatchConsoleData, type MatchConsoleData } from "@/lib/match-console";
import { getBroadcastChannel, type BroadcastStatePayload } from "@/lib/realtime/broadcast";

export function RoomHudOverlay({ tournamentId, matchNumber }: { tournamentId: string; matchNumber: number }) {
  const [data, setData] = useState<MatchConsoleData | null>(null);
  const [state, setState] = useState<BroadcastStatePayload | null>(null);

  useEffect(() => {
    if (!tournamentId) return;
    void getMatchConsoleData(tournamentId, matchNumber).then(setData).catch(() => undefined);
    const channel = getBroadcastChannel(tournamentId);
    channel.on("broadcast", { event: "state" }, (message) => setState(message.payload as BroadcastStatePayload));
    channel.subscribe();
    return () => { void channel.unsubscribe(); };
  }, [tournamentId, matchNumber]);

  if (!data) return <div className="broadcast-stage room-stage"><span className="broadcast-kicker">ROOM HUD</span><h2>Waiting for roster data…</h2></div>;

  const activeTeam = state?.currentPlayer ? data.teams.find((team) => team.id === state.currentPlayer?.teamId) : data.teams[0];

  return (
    <div className="broadcast-stage room-stage">
      <div className="room-top">
        <div><span className="broadcast-kicker">FREE FIRE TOURNAMENT</span><h2>{data.tournamentName}</h2></div>
        <span className="room-badge">MATCH {String(matchNumber).padStart(2, "0")}</span>
      </div>
      {activeTeam && <div className="hud-card">
        <span className="hud-slot">TEAM SLOT {String(activeTeam.teamNumber).padStart(2, "0")}</span>
        <span className="hud-team">{activeTeam.teamPrefix}</span>
        <strong>{state?.currentPlayer?.registeredName ?? activeTeam.teamName}</strong>
        <span className="hud-note">{state?.currentPlayer?.inGameName ? "IN-GAME: " + state.currentPlayer.inGameName : "Registered-name presentation"}</span>
        <div className="hud-grid">
          {data.teams.slice(0, 6).map((team) => <div className="mini-slot" key={team.id}><span>TEAM {team.teamNumber}</span><strong>{team.teamPrefix}</strong><small>{team.teamName}</small></div>)}
        </div>
      </div>}
    </div>
  );
}
