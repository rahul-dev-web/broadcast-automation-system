"use client";

import { useEffect, useState } from "react";
import { getBroadcastChannel, type BroadcastStatePayload } from "@/lib/realtime/broadcast";

const initialState: BroadcastStatePayload = {
  stage: "ROOM",
  tournamentId: "",
  matchNumber: 1,
  inputMode: "MANUAL",
  currentPlayer: null,
  updatedAt: new Date(0).toISOString(),
};

export function LiveOverlay({ tournamentId }: { tournamentId: string }) {
  const [state, setState] = useState<BroadcastStatePayload>({ ...initialState, tournamentId });
  const [connection, setConnection] = useState("CONNECTING");

  useEffect(() => {
    const channel = getBroadcastChannel(tournamentId);
    channel.on("broadcast", { event: "state" }, (message) => setState(message.payload as BroadcastStatePayload));
    channel.subscribe((status) => setConnection(status));
    return () => { void channel.unsubscribe(); };
  }, [tournamentId]);

  return (
    <main className="broadcast-live-shell">
      <div className="broadcast-live-status">{connection}</div>
      <div className="broadcast-live-stage">
        <span className="broadcast-kicker">LIVE BROADCAST</span>
        <h1>{state.stage.replaceAll("_", " ")}</h1>
        <p>MATCH {state.matchNumber ?? "—"}</p>
        {state.currentPlayer ? (
          <div className="live-player-banner">
            <span>OBSERVED PLAYER</span>
            <strong>{state.currentPlayer.registeredName}</strong>
            <small>{state.currentPlayer.inGameName ?? "Mapped identity"}</small>
          </div>
        ) : <p className="muted">Waiting for live state…</p>}
      </div>
    </main>
  );
}
