"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getMatchPtData, type MatchPtData } from "@/lib/match-pt";

function MatchPtContent() {
  const params = useSearchParams();
  const tournamentId = params.get("tournament") ?? "";
  const parsed = Number(params.get("match") ?? "1");
  const matchNumber = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const [data, setData] = useState<MatchPtData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) { setLoading(false); return; }
    void getMatchPtData(tournamentId, matchNumber)
      .then(setData)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load match PT."))
      .finally(() => setLoading(false));
  }, [tournamentId, matchNumber]);

  if (!tournamentId) return <main className="shell"><section className="panel"><h1>Match PT</h1><p className="muted">Missing tournament query parameter.</p></section></main>;
  if (loading) return <main className="shell"><section className="panel"><p className="muted">Loading match PT…</p></section></main>;
  if (error || !data) return <main className="shell"><section className="panel"><p className="error-banner">{error || "Match PT unavailable."}</p></section></main>;

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">MATCH PT · VERIFIED RESULT</p>
          <h1>{data.tournamentName} · Match {data.matchNumber}</h1>
          <p className="muted">Presentation uses the official verified result for this match.</p>
        </div>
        <span className="status-pill">{data.ptMode}</span>
      </header>
      <section className="panel">
        <div className="section-title">
          <div><p className="eyebrow">POINT TABLE</p><h2>Match {data.matchNumber} standings</h2></div>
          <span className="room-badge">VERIFIED</span>
        </div>
        <div className="pt-table">
          {data.rows.map((row) => (
            <article className="pt-row" key={row.teamId}>
              <strong className="pt-place">{row.placement ?? "—"}</strong>
              <div><strong>{row.teamName}</strong><span>{row.teamPrefix}</span></div>
              <span>{row.kills} KILLS</span>
              <strong className="pt-total">{row.totalPoints}</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function MatchPtPage() {
  return <Suspense fallback={<main className="shell"><section className="panel"><p className="muted">Loading match PT…</p></section></main>}><MatchPtContent /></Suspense>;
}
