"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMatchReviewData,
  updateReviewKills,
  verifyMatchResult,
  type MatchReviewData,
  type MatchReviewTeam,
} from "@/lib/match-review";

export function MatchReviewConsole({ tournamentId, matchNumber }: { tournamentId: string; matchNumber: number }) {
  const [data, setData] = useState<MatchReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const requestRef = useRef(0);
  const inFlightRef = useRef(false);
  const dataRef = useRef<MatchReviewData | null>(null);

  const load = useCallback(async (showLoading = true) => {
    // Never allow overlapping background reads to race and put an older snapshot
    // back into state after a newer REVIEW snapshot has already arrived.
    if (!showLoading && inFlightRef.current) return;
    const requestId = ++requestRef.current;
    inFlightRef.current = true;
    if (showLoading) setLoading(true);
    setError("");
    try {
      const next = await getMatchReviewData(tournamentId, matchNumber);
      if (requestId !== requestRef.current) return;
      dataRef.current = next;
      setData(next);
    } catch (caught) {
      if (requestId !== requestRef.current) return;
      setError(caught instanceof Error ? caught.message : "Could not load review.");
    } finally {
      if (requestId === requestRef.current) {
        inFlightRef.current = false;
        if (showLoading) setLoading(false);
      }
    }
  }, [tournamentId, matchNumber]);

  useEffect(() => { void load(); }, [load]);

  // Keep the review route synchronized from the moment it mounts. The route may render
  // before the LIVE → REVIEW database writes have become visible to the first read.
  // Polling is single-flight so an older response can never overwrite a newer snapshot.
  // This removes the need to leave/re-open the page just to make VERIFY & PUBLISH appear.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = dataRef.current;
      if (current?.officialResultExists || current?.matchStatus === "VERIFIED") return;
      void load(false);
    }, 600);
    return () => window.clearInterval(timer);
  }, [load]);

  async function changeKills(team: MatchReviewTeam, delta: number) {
    if (!data || data.matchStatus !== "REVIEW") return;
    setBusy(team.id);
    setError("");
    try {
      await updateReviewKills(data.matchId, team, team.kills + delta);
      await load(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update result.");
    } finally {
      setBusy(null);
    }
  }

  async function verify() {
    if (!data) return;
    setBusy("verify");
    setError("");
    try {
      await verifyMatchResult(data);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not verify match.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <section className="panel"><p className="muted">Loading match review…</p></section>;
  if (!data) return <section className="panel"><p className="error-banner">{error || "Match unavailable."}</p></section>;

  const sortedTeams = [...data.teams].sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));
  const placementsReady = data.teams.length > 0 && data.teams.every((team) => team.placement !== null);
  const aliveTeams = data.teams.filter((team) => team.eliminationStatus === "ALIVE");
  const canVerify = data.matchStatus === "REVIEW" && !data.officialResultExists && placementsReady && aliveTeams.length === 1;

  return (
    <main className="match-review">
      <header className="topbar">
        <div>
          <p className="eyebrow">MATCH REVIEW · OFFICIALIZATION GATE</p>
          <h1>{data.tournamentName} · Match {data.matchNumber}</h1>
          <p className="muted">
            {data.inputMode} data is still provisional here. Verify publishes the official match result.
          </p>
        </div>
        <div className="console-actions">
          <span className="status-pill">{data.matchStatus}</span>
          {canVerify && (
            <button className="primary-button" disabled={busy !== null || !placementsReady || aliveTeams.length !== 1} onClick={() => void verify()}>
              {busy === "verify" ? "VERIFYING…" : "VERIFY & PUBLISH"}
            </button>
          )}
          {data.matchStatus === "REVIEW" && !data.officialResultExists && !placementsReady && (
            <span className="muted">Waiting for final placements to sync…</span>
          )}
          {data.matchStatus === "REVIEW" && !data.officialResultExists && placementsReady && aliveTeams.length !== 1 && (
            <span className="muted">Waiting for the final surviving team…</span>
          )}
          <a
            className="primary-button"
            href={`/broadcast/control?tournament=${encodeURIComponent(tournamentId)}`}
          >
            {data.matchStatus === "VERIFIED" || data.officialResultExists
              ? "CONTINUE TO BROADCAST CONTROL"
              : "BACK TO BROADCAST CONTROL"}
          </a>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="panel review-banner">
        <strong>{data.officialResultExists ? "OFFICIAL RESULT PUBLISHED" : "PROPOSED / REVIEW RESULT"}</strong>
        <span>
          {data.officialResultExists
            ? "This match is already verified and its official result is stored."
            : "Check placement and kills before publishing. Once verified, the match becomes immutable through this review screen."}
        </span>
      </section>

      <section className="panel">
        <div className="section-title">
          <div><p className="eyebrow">FINAL STANDINGS</p><h2>Review before official result</h2></div>
          <p className="muted">Kills can be corrected here; placement comes from the match elimination order.</p>
        </div>

        <div className="review-table">
          <div className="review-head">
            <span>POS</span><span>TEAM</span><span>KILLS</span><span>POINTS</span><span>STATUS</span>
          </div>
          {sortedTeams.map((team) => (
            <article className="review-row" key={team.id}>
              <strong className="review-place">{team.placement ?? "—"}</strong>
              <div className="review-team">
                <strong>{team.teamName}</strong>
                <span>{team.teamPrefix}</span>
              </div>
              <div className="review-kills">
                <button disabled={data.matchStatus !== "REVIEW" || busy !== null} onClick={() => void changeKills(team, -1)}>−</button>
                <strong>{team.kills}</strong>
                <button disabled={data.matchStatus !== "REVIEW" || busy !== null} onClick={() => void changeKills(team, 1)}>+</button>
              </div>
              <div className="review-points">
                <strong>{team.totalPoints}</strong>
                <span>{team.killPoints} K + {team.positionPoints} P</span>
              </div>
              <span className={team.eliminationStatus === "ALIVE" ? "review-status alive" : "review-status"}>
                {team.eliminationStatus === "ALIVE" ? "WINNER" : "ELIMINATED"}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">OFFICIAL RESULT PIPELINE</p>
        <div className="review-pipeline">
          <span>MANUAL / OCR INPUT</span><b>→</b><span>REVIEW</span><b>→</b><span className={data.matchStatus === "VERIFIED" ? "active" : ""}>OFFICIAL MATCH RESULT</span><b>→</b><span>PT / NEXT MATCH</span>
        </div>
      </section>
    </main>
  );
}
