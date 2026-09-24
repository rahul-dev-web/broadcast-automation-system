"use client";

import { useEffect, useState } from "react";
import { LiveOverlay } from "@/components/broadcast/live-overlay";

export default function LiveOverlayPage() {
  const [tournamentId, setTournamentId] = useState("");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("tournament");
    if (value) setTournamentId(value);
  }, []);

  if (!tournamentId) {
    return (
      <main className="broadcast-live-shell">
        <div className="broadcast-live-stage">
          <h1>Broadcast Overlay</h1>
          <p>Add <code>?tournament=&lt;TOURNAMENT_ID&gt;</code> to connect this Browser Source.</p>
        </div>
      </main>
    );
  }

  return <LiveOverlay tournamentId={tournamentId} />;
}
