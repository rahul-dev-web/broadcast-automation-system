"use client";

import { useEffect, useMemo, useState } from "react";
import { getBroadcastChannel, type BroadcastStatePayload } from "@/lib/realtime/broadcast";
import { supabase } from "@/lib/supabase/client";

const initialState: BroadcastStatePayload = {
  stage: "ROOM",
  tournamentId: "",
  matchNumber: 1,
  inputMode: "MANUAL",
  currentPlayer: null,
  data: {},
  updatedAt: new Date(0).toISOString(),
};

function normalizePayload(tournamentId: string, raw: Record<string, unknown> | null | undefined): BroadcastStatePayload {
  const currentPlayer = raw?.currentPlayer;
  return {
    ...initialState,
    tournamentId,
    stage: typeof raw?.stage === "string" ? raw.stage as BroadcastStatePayload["stage"] : "ROOM",
    matchNumber: typeof raw?.matchNumber === "number" ? raw.matchNumber : 1,
    inputMode: raw?.inputMode === "OCR" ? "OCR" : "MANUAL",
    currentPlayer:
      currentPlayer && typeof currentPlayer === "object"
        ? currentPlayer as BroadcastStatePayload["currentPlayer"]
        : null,
    data: raw ?? {},
    updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString(),
  };
}

export function LiveOverlay({ tournamentId }: { tournamentId: string }) {
  const [state, setState] = useState<BroadcastStatePayload>({ ...initialState, tournamentId });
  const [connection, setConnection] = useState("CONNECTING");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const channel = getBroadcastChannel(tournamentId);

    const applyRealtime = (payload: BroadcastStatePayload) => {
      if (!active || payload.tournamentId !== tournamentId) return;
      setState((current) =>
        new Date(payload.updatedAt).getTime() >= new Date(current.updatedAt).getTime()
          ? payload
          : current,
      );
    };

    channel.on("broadcast", { event: "state" }, (message) => {
      applyRealtime(message.payload as BroadcastStatePayload);
    });

    channel.subscribe((status) => {
      if (active) setConnection(status);
    });

    // Browser sources are often opened after the controller already changed
    // stage. Realtime only delivers future events, so hydrate from the
    // persisted Supabase session as the initial source of truth.
    void (async () => {
      const { data, error } = await supabase
        .from("broadcast_sessions")
        .select("state, state_payload, updated_at")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (!error && data) {
        const payload = {
          ...((data.state_payload ?? {}) as Record<string, unknown>),
          stage: data.state,
          updatedAt: data.updated_at,
        };
        setState((current) => {
          const next = normalizePayload(tournamentId, payload);
          return new Date(next.updatedAt).getTime() >= new Date(current.updatedAt).getTime()
            ? next
            : current;
        });
      }

      setHydrated(true);
    })();

    return () => {
      active = false;
      void channel.unsubscribe();
    };
  }, [tournamentId]);

  const stageLabel = useMemo(
    () => state.stage.replaceAll("_", " "),
    [state.stage],
  );

  const isLive = connection === "SUBSCRIBED";
  const waiting = !hydrated;

  return (
    <main className="broadcast-overlay">
      <div className="broadcast-overlay-grid" />
      <div className="broadcast-overlay-glow broadcast-overlay-glow-one" />
      <div className="broadcast-overlay-glow broadcast-overlay-glow-two" />

      <header className="broadcast-overlay-header">
        <div className="broadcast-brand">
          <span className="broadcast-brand-mark">BA</span>
          <div>
            <span className="broadcast-brand-title">BROADCAST AUTOMATION</span>
            <span className="broadcast-brand-subtitle">LIVE PRODUCTION FEED</span>
          </div>
        </div>
        <div className="broadcast-live-badge">
          <span className={isLive ? "live-dot" : "live-dot offline"} />
          {isLive ? "LIVE" : connection}
        </div>
      </header>

      <section className="broadcast-overlay-main">
        <div className="broadcast-match-meta">
          <span>MATCH {String(state.matchNumber ?? 1).padStart(2, "0")}</span>
          <i />
          <span>{state.inputMode} FEED</span>
        </div>

        <div className="broadcast-stage-copy">
          <span className="broadcast-stage-eyebrow">CURRENT BROADCAST STATE</span>
          <h1>{stageLabel}</h1>
          <p>
            {waiting
              ? "Syncing with the broadcast controller…"
              : state.stage === "ROOM"
                ? "Match room is ready for the next operator cue."
                : "Live state synchronized with the operator controller."}
          </p>
        </div>

        {state.currentPlayer ? (
          <div className="broadcast-player-card">
            <span className="broadcast-player-label">PLAYER SPOTLIGHT</span>
            <strong>{state.currentPlayer.registeredName}</strong>
            <span>
              {state.currentPlayer.inGameName ?? "Tournament identity"} · TEAM {state.currentPlayer.teamNumber}
            </span>
          </div>
        ) : (
          <div className="broadcast-status-card">
            <span className="broadcast-status-label">ON-AIR STATUS</span>
            <strong>{waiting ? "SYNCING" : "READY"}</strong>
            <span>{waiting ? "Loading persisted broadcast state" : "Awaiting next production cue"}</span>
          </div>
        )}
      </section>

      <footer className="broadcast-overlay-footer">
        <span>TOURNAMENT {tournamentId.slice(0, 8).toUpperCase()}</span>
        <span className="broadcast-footer-separator">•</span>
        <span>{stageLabel}</span>
        <span className="broadcast-footer-separator">•</span>
        <span>OBS BROWSER SOURCE</span>
      </footer>
    </main>
  );
}
