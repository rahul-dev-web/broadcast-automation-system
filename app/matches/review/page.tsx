"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MatchReviewConsole } from "@/components/scoring/match-review-console";

function ReviewPageContent() {
  const params = useSearchParams();
  const tournamentId = params.get("tournament") ?? "";
  const parsedMatch = Number(params.get("match") ?? "1");
  const matchNumber = Number.isFinite(parsedMatch) && parsedMatch > 0 ? parsedMatch : 1;

  if (!tournamentId) {
    return <main className="shell"><section className="panel"><h1>Match review</h1><p className="muted">Missing tournament query parameter.</p></section></main>;
  }

  return <main className="shell"><MatchReviewConsole tournamentId={tournamentId} matchNumber={matchNumber} /></main>;
}

export default function MatchReviewPage() {
  return (
    <Suspense fallback={<main className="shell"><section className="panel"><p className="muted">Loading match review…</p></section></main>}>
      <ReviewPageContent />
    </Suspense>
  );
}
