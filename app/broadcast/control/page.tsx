"use client";

import { Suspense, useEffect, useState } from "react";
import { BroadcastControl } from "@/components/broadcast/broadcast-control";

function BroadcastControlPageContent() {
  const [tournamentId, setTournamentId] = useState("");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("tournament");
    if (value) setTournamentId(value);
  }, []);

  if (!tournamentId) {
    return (
      <main className="shell">
        <section className="panel">
          <h1>Broadcast controller</h1>
          <p className="muted">Missing tournament query parameter.</p>
        </section>
      </main>
    );
  }

  return <BroadcastControl tournamentId={tournamentId} />;
}

export default function BroadcastControlPage() {
  return (
    <Suspense fallback={<main className="shell"><section className="panel"><p className="muted">Loading broadcast controller…</p></section></main>}>
      <BroadcastControlPageContent />
    </Suspense>
  );
}
