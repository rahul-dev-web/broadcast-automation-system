"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getOverallData, type OverallData } from "@/lib/overall";

function OverallContent() {
  const params = useSearchParams();
  const tournamentId = params.get("tournament") ?? "";
  const [data, setData] = useState<OverallData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }
    void getOverallData(tournamentId)
      .then(setData)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load overall."))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (!tournamentId) return <main className="shell"><section className="panel"><h1>Overall standings</h1><p className="muted">Missing tournament query parameter.</p></section></main>;
  if (loading) return <main className="shell"><section className="panel"><p className="muted">Loading overall standings…</p></section></main>;
  if (error || !data) return <main className="shell"><section className="panel"><p className="error-banner">{error || "Overall unavailable."}</p></section></main>;

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">OVERALL · VERIFIED DATA ONLY</p>
          <h1>{data.tournamentName}</h1>
          <p className="muted">{data.teams.length} active teams · {data.totalMatches} planned matches · {data.teams[0]?.matchesPlayed ?? 0} verified matches reflected</p>
        </div>
        <span className="status-pill">{data.ptMode}</span>
      </header>

      <section className="panel">
        <div className="section-title">
          <div><p className="eyebrow">CUMULATIVE STANDINGS</p><h2>Official points by verified match</h2></div>
          <p className="muted">Only verified match results contribute to the overall.</p>
        </div>
        <div className="overall-table">
          <div className="overall-head"><span>POS</span><span>TEAM</span><span>MATCHES</span><span>KILLS</span><span>TOTAL</span></div>
          {data.teams.map((team, index) => (
            <article className="overall-row" key={team.teamId}>
              <strong className="overall-rank">{index + 1}</strong>
              <div><strong>{team.teamName}</strong><span>{team.teamPrefix}</span></div>
              <span>{team.matchesPlayed}</span>
              <span>{team.totalKills}</span>
              <strong className="overall-total">{team.totalPoints}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">MATCH BREAKDOWN</p>
        <div className="overall-matches">
          {Array.from({ length: data.totalMatches }, (_, i) => i + 1).map((matchNumber) => (
            <div className="overall-match" key={matchNumber}>
              <strong>M{matchNumber}</strong>
              {data.teams.map((team) => <span key={team.teamId}>{team.matchPoints[matchNumber - 1]}</span>)}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function OverallPage() {
  return <Suspense fallback={<main className="shell"><section className="panel"><p className="muted">Loading overall standings…</p></section></main>}><OverallContent /></Suspense>;
}
