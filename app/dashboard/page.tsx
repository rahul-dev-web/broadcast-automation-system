"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type TournamentRow = {
  id: string;
  name: string;
  total_matches: number;
  status: string | null;
  created_at: string | null;
};

export default function DashboardPage() {
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("tournaments")
      .select("id, name, total_matches, status, created_at")
      .order("created_at", { ascending: false });
    if (queryError) {
      setError(queryError.message);
      setTournaments([]);
    } else {
      setTournaments((data ?? []) as TournamentRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadTournaments(); }, [loadTournaments]);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">OPERATOR</p>
          <h1>Broadcast Control</h1>
          <p className="muted">Your created tournaments and their broadcast sessions.</p>
        </div>
        <Link className="primary-button" href="/tournaments/new/">
          + New Tournament
        </Link>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">TOURNAMENT WORKSPACE</p>
            <h2>Created tournaments</h2>
          </div>
          <button className="ghost-button" type="button" onClick={() => void loadTournaments()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {error && <div className="error-banner" role="alert">Could not load tournaments: {error}</div>}
        {loading ? (
          <p className="muted">Loading tournaments from Supabase…</p>
        ) : tournaments.length === 0 ? (
          <div className="empty-state">
            <h3>No tournaments created yet</h3>
            <p className="muted">Create a tournament to see it listed here and open its control room.</p>
            <Link className="primary-button" href="/tournaments/new/">Create first tournament</Link>
          </div>
        ) : (
          <div className="tournament-list">
            {tournaments.map((tournament) => (
              <article className="tournament-list-card" key={tournament.id}>
                <div className="tournament-list-main">
                  <p className="eyebrow">{tournament.status || "READY"}</p>
                  <h3>{tournament.name}</h3>
                  <p className="muted">{tournament.total_matches} planned matches</p>
                  {tournament.created_at && (
                    <p className="tournament-created">Created {new Date(tournament.created_at).toLocaleString()}</p>
                  )}
                </div>
                <Link
                  className="primary-button"
                  href={`/broadcast/control?tournament=${encodeURIComponent(tournament.id)}`}
                >
                  Start / Open Control
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid-2">
        <article className="panel">
          <div className="panel-header">
            <div><p className="eyebrow">CONFIGURATION</p><h2>Event setup</h2></div>
            <span className="status-pill">UP TO 12 TEAMS</span>
          </div>
          <p className="muted">Configure teams, player rosters, match count and points-table presentation before opening the broadcast controller.</p>
          <div className="stat-row">
            <div><span className="stat-value">12</span><span className="stat-label">Team slots</span></div>
            <div><span className="stat-value">5</span><span className="stat-label">Players / team</span></div>
            <div><span className="stat-value">3</span><span className="stat-label">PT modes</span></div>
          </div>
          <Link className="ghost-button" href="/tournaments/new/">Open tournament setup</Link>
        </article>
        <article className="panel">
          <p className="eyebrow">OPERATOR FLOW</p>
          <h2>Setup → Control → Live</h2>
          <p className="muted">Choose a tournament below and open its control room. Use “START AUTOMATION” there to begin its roster and broadcast sequence.</p>
          <p className="muted">The control room is connected to that tournament’s saved Supabase session.</p>
        </article>
      </section>
    </main>
  );
}
