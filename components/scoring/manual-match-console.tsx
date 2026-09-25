"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  eliminateTeam,
  finishManualMatch,
  getMatchConsoleData,
  setTeamKills,
  startManualMatch,
  type MatchConsoleData,
  type MatchConsoleTeam,
} from "@/lib/match-console";

const killKeys = ["1","2","3","4","5","6","7","8","9","0"];
const eliminateKeys = ["Q","W","E","R","T","Y","U","I","O","P"];

export function ManualMatchConsole({ tournamentId, matchNumber }: { tournamentId: string; matchNumber: number }) {
  const [data, setData] = useState<MatchConsoleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await getMatchConsoleData(tournamentId, matchNumber)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load match."); }
    finally { setLoading(false); }
  }, [tournamentId, matchNumber]);

  useEffect(() => { void load(); }, [load]);

  const aliveCount = useMemo(() => data?.teams.filter((team) => team.eliminationStatus === "ALIVE").length ?? 0, [data]);

  async function changeKills(team: MatchConsoleTeam, delta: number) {
    if (!data || team.eliminationStatus === "ELIMINATED") return;
    setBusy(team.id); setError("");
    try { await setTeamKills(data.matchId, team, team.kills + delta); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update kills."); }
    finally { setBusy(null); }
  }

  async function eliminate(team: MatchConsoleTeam) {
    if (!data || team.eliminationStatus === "ELIMINATED") return;
    setBusy(team.id); setError("");
    try { await eliminateTeam(data, team.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not eliminate team."); }
    finally { setBusy(null); }
  }

  useEffect(() => {
    if (!data || data.matchStatus !== "LIVE") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
      const key = event.key.toUpperCase();
      const killIndex = killKeys.indexOf(key);
      if (killIndex >= 0 && data.teams[killIndex]) { event.preventDefault(); void changeKills(data.teams[killIndex], 1); return; }
      const eliminateIndex = eliminateKeys.indexOf(key);
      if (eliminateIndex >= 0 && data.teams[eliminateIndex]) { event.preventDefault(); void eliminate(data.teams[eliminateIndex]); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [data]);

  if (loading) return <section className="panel"><p className="muted">Loading match console…</p></section>;
  if (!data) return <section className="panel"><p className="error-banner">{error || "Match unavailable."}</p></section>;

  const canStart = data.matchStatus === "PENDING";
  const canFinish = data.matchStatus === "LIVE" && aliveCount === 1;

  return (
    <main className="match-console">
      <header className="topbar">
        <div>
          <p className="eyebrow">MANUAL MATCH ENGINE</p>
          <h1>{data.tournamentName} · Match {data.matchNumber}</h1>
          <p className="muted">Manual mode = scoring/result input only. No player auto-switching.</p>
        </div>
        <div className="console-actions">
          <span className="status-pill">{data.matchStatus}</span>
          {canStart && <button className="primary-button" disabled={busy !== null} onClick={async () => {
            setBusy("start"); setError("");
            try { await startManualMatch(data.matchId); await load(); }
            catch (e) { setError(e instanceof Error ? e.message : "Could not start match."); }
            finally { setBusy(null); }
          }}>START MATCH</button>}
          {canFinish && <button className="primary-button" disabled={busy !== null} onClick={async () => {
            setBusy("finish"); setError("");
            try { await finishManualMatch(data.matchId); await load(); }
            catch (e) { setError(e instanceof Error ? e.message : "Could not finish match."); }
            finally { setBusy(null); }
          }}>END MATCH → REVIEW</button>}
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="panel console-summary">
        <div><strong>{data.teams.length}</strong><span>active team slots</span></div>
        <div><strong>{aliveCount}</strong><span>teams alive</span></div>
        <div><strong>{data.inputMode}</strong><span>input mode</span></div>
        <div><strong>{data.matchNumber}/{data.totalMatches}</strong><span>match progress</span></div>
      </section>

      <section className="panel">
        <div className="section-title">
          <div><p className="eyebrow">LIVE SCORING</p><h2>Fast operator console</h2></div>
          <p className="muted">Keys 1–0 = +1 kill • Q–P = eliminate teams 1–10</p>
        </div>

        <div className="manual-team-list">
          {data.teams.map((team, index) => {
            const eliminated = team.eliminationStatus === "ELIMINATED";
            const disabled = data.matchStatus !== "LIVE" || eliminated || busy !== null;
            return (
              <article className={eliminated ? "manual-team-row eliminated" : "manual-team-row"} key={team.id}>
                <div className="manual-team-index"><span>{String(team.teamNumber).padStart(2, "0")}</span><kbd>{killKeys[index] ?? "—"}</kbd></div>
                <div className="manual-team-identity"><strong>{team.teamName}</strong><span>{team.teamPrefix} · {eliminated ? "PLACEMENT " + team.placement : "ALIVE"}</span></div>
                <div className="kill-control">
                  <button className="kill-button" disabled={disabled} onClick={() => void changeKills(team, -1)}>−</button>
                  <strong>{team.kills}</strong>
                  <button className="kill-button plus" disabled={disabled} onClick={() => void changeKills(team, 1)}>+</button>
                </div>
                <div className="manual-points"><span>{team.totalPoints} PT</span><small>{team.killPoints} K + {team.positionPoints} P</small></div>
                <button className="eliminate-button" disabled={disabled} onClick={() => void eliminate(team)}>
                  {eliminated ? "#" + team.placement : "ELIMINATE"} {!eliminated && index < eliminateKeys.length && <kbd>{eliminateKeys[index]}</kbd>}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel console-note">
        <strong>Operator rule</strong>
        <span>Placement is derived from elimination order. Do not type placement manually. The final surviving team becomes 1st.</span>
      </section>
    </main>
  );
}
