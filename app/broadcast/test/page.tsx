"use client";

import { useEffect, useState } from "react";
import { BroadcastTestPanel } from "@/components/broadcast/test-panel";

export default function BroadcastTestPage() {
  const [tournamentId, setTournamentId] = useState("");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("tournament");
    if (value) setTournamentId(value);
  }, []);

  if (!tournamentId) {
    return (
      <main className="broadcast-live-shell">
        <div className="broadcast-live-stage">
          <h1>Realtime Broadcast Test</h1>
          <p>Add <code>?tournament=&lt;TOURNAMENT_ID&gt;</code> to connect.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="broadcast-live-shell">
      <div className="broadcast-live-stage">
        <h1>Realtime Broadcast Test</h1>
        <BroadcastTestPanel tournamentId={tournamentId} />
      </div>
    </main>
  );
}
