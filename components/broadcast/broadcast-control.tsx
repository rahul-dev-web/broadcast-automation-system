"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  advanceAfterPt,
  advanceAfterVerifiedMatch,
  closeBroadcast,
  getBroadcastSession,
  openRoomStage,
  openThankYouStage,
  setRosterPage,
  startTournamentBroadcast,
} from "@/lib/broadcast-controller";
import { supabase } from "@/lib/supabase/client";
import type { BroadcastStage } from "@/lib/types/tournament";
import { getBroadcastChannel, type BroadcastStatePayload } from "@/lib/realtime/broadcast";

interface ControlData {
  tournamentName: string;
  totalMatches: number;
  ptMode: "PER_MATCH" | "OVERALL_ONLY" | "CUSTOM";
  selectedPtMatches: number[];
  currentStage: BroadcastStage;
  matchNumber: number;
}

export function BroadcastControl({ tournamentId }: { tournamentId: string }) {
  const [data, setData] = useState<ControlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const channel = useMemo(() => getBroadcastChannel(tournamentId), [tournamentId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [{ data: tournament, error: tournamentError }, session] = await Promise.all([
        supabase
          .from("tournaments")
          .select("name, total_matches, pt_mode, selected_pt_matches")
          .eq("id", tournamentId)
          .single(),
        getBroadcastSession(tournamentId),
      ]);
      if (tournamentError) throw tournamentError;

      const payload = (session?.state_payload ?? {}) as Record<string, unknown>;
      const stage = (session?.state as BroadcastStage | undefined) ?? "SETUP";
      const matchNumber = typeof payload.matchNumber === "number" ? payload.matchNumber : 1;

      setData({
        tournamentName: String(tournament.name),
        totalMatches: Number(tournament.total_matches),
        ptMode: tournament.pt_mode,
        selectedPtMatches: (tournament.selected_pt_matches ?? []).map(Number),
        currentStage: stage,
        matchNumber,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load broadcast controller.");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    channel.on("broadcast", { event: "state" }, (message) => {
      const payload = message.payload as BroadcastStatePayload;
      if (payload.tournamentId !== tournamentId) return;
      setData((current) => current ? {
        ...current,
        currentStage: payload.stage,
        matchNumber: typeof payload.matchNumber === "number" ? payload.matchNumber : current.matchNumber,
      } : current);
    });
    channel.subscribe();
    return () => { void channel.unsubscribe(); };
  }, [channel, tournamentId]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Broadcast action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="shell"><section className="panel"><p className="muted">Loading broadcast controller…</p></section></main>;
  if (!data) return <main className="shell"><section className="panel"><p className="error-banner">{error || "Tournament unavailable."}</p></section></main>;

  const showPt =
    data.ptMode === "PER_MATCH" ||
    (data.ptMode === "CUSTOM" && data.selectedPtMatches.includes(data.matchNumber));

  const actionButtons: Array<{ label: string; action: () => Promise<unknown> }> = [];

  if (data.currentStage === "SETUP") {
    actionButtons.push({ label: "START AUTOMATION", action: () => startTournamentBroadcast(tournamentId) });
  } else if (data.currentStage === "AUTOMATION_STARTED") {
    actionButtons.push({ label: "SHOW ROSTER · PAGE 1", action: () => setRosterPage(tournamentId, 1) });
  } else if (data.currentStage === "ROSTER_1") {
    actionButtons.push({ label: "SHOW ROSTER · PAGE 2", action: () => setRosterPage(tournamentId, 2) });
  } else if (data.currentStage === "ROSTER_2") {
    actionButtons.push({ label: "CLOSE ROSTER → ROOM", action: () => openRoomStage(tournamentId, 1) });
  } else if (data.currentStage === "MATCH_LIVE") {
    actionButtons.push({ label: "OPEN MATCH REVIEW", action: async () => { window.location.href = `/matches/review?tournament=${encodeURIComponent(tournamentId)}&match=${data.matchNumber}`; } });
  } else if (data.currentStage === "MATCH_REVIEW") {
    actionButtons.push({ label: "OPEN MATCH REVIEW", action: async () => { window.location.href = `/matches/review?tournament=${encodeURIComponent(tournamentId)}&match=${data.matchNumber}`; } });
  } else if (data.currentStage === "MATCH_VERIFIED") {
    actionButtons.push({
      label: showPt ? `SHOW MATCH ${data.matchNumber} PT` : data.matchNumber < data.totalMatches ? `OPEN MATCH ${data.matchNumber + 1} ROOM` : "SHOW OVERALL",
      action: () => advanceAfterVerifiedMatch(tournamentId, data.matchNumber, data.totalMatches, showPt),
    });
  } else if (data.currentStage === "MATCH_PT") {
    actionButtons.push({
      label: data.matchNumber < data.totalMatches ? `OPEN MATCH ${data.matchNumber + 1} ROOM` : "SHOW OVERALL",
      action: () => advanceAfterPt(tournamentId, data.matchNumber, data.totalMatches),
    });
  } else if (data.currentStage === "OVERALL") {
    actionButtons.push({ label: "SHOW THANK YOU", action: () => openThankYouStage(tournamentId) });
  } else if (data.currentStage === "THANK_YOU") {
    actionButtons.push({ label: "CLOSE BROADCAST", action: () => closeBroadcast(tournamentId) });
  }

  const canOpenManualMatch = data.currentStage === "ROOM";

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">BROADCAST SESSION CONTROLLER</p>
          <h1>{data.tournamentName}</h1>
          <p className="muted">Central stage control for the operator. Scoring remains in the match console.</p>
        </div>
        <span className="status-pill">{data.currentStage.replaceAll("_", " ")}</span>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="panel console-summary">
        <div><strong>M{data.matchNumber}</strong><span>current match</span></div>
        <div><strong>{data.totalMatches}</strong><span>planned matches</span></div>
        <div><strong>{data.ptMode}</strong><span>PT mode</span></div>
        <div><strong>{showPt ? "YES" : "NO"}</strong><span>PT after this match</span></div>
      </section>

      <section className="panel">
        <p className="eyebrow">NEXT OPERATOR ACTION</p>
        <h2>{actionButtons[0]?.label ?? "Stage is waiting for a match/operator surface."}</h2>
        <div className="console-actions">
          {actionButtons.map((button) => (
            <button key={button.label} className="primary-button" disabled={busy} onClick={() => void run(button.action)}>
              {busy ? "PROCESSING…" : button.label}
            </button>
          ))}
        </div>
      </section>

      {canOpenManualMatch && (
        <section className="panel">
          <p className="eyebrow">MATCH CONTROL</p>
          <h2>Room is live — open the scoring console</h2>
          <p className="muted">The match console starts the database match and publishes MATCH_LIVE. Manual mode does not contain player-switch controls.</p>
          <a className="primary-button" href={`/matches/manual?tournament=${encodeURIComponent(tournamentId)}&match=${data.matchNumber}`}>OPEN MANUAL MATCH CONSOLE</a>
        </section>
      )}

      <section className="panel">
        <p className="eyebrow">BROADCAST ROUTES</p>
        <div className="review-pipeline">
          <span>OPERATOR CONTROLLER</span><b>→</b><span>SUPABASE SESSION</span><b>→</b><span>REALTIME</span><b>→</b><span>BROWSER OVERLAY</span>
        </div>
        <p className="muted">Overlay: <code>/overlay/live?tournament={tournamentId}</code></p>
      </section>
    </main>
  );
}
