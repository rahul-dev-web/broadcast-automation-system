"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ManualMatchConsole } from "@/components/scoring/manual-match-console";

function ManualMatchPageContent() {
  const params = useSearchParams();
  const tournamentId = params.get("tournament") ?? "";
  const parsedMatch = Number(params.get("match") ?? "1");
  const matchNumber = Number.isFinite(parsedMatch) && parsedMatch > 0 ? parsedMatch : 1;

  if (!tournamentId) {
    return <main className="shell"><section className="panel"><h1>Manual match console</h1><p className="muted">Missing tournament query parameter.</p></section></main>;
  }

  return <main className="shell"><ManualMatchConsole tournamentId={tournamentId} matchNumber={matchNumber} /></main>;
}

export default function ManualMatchPage() {
  return <Suspense fallback={<main className="shell"><section className="panel"><p className="muted">Loading match console…</p></section></main>}><ManualMatchPageContent /></Suspense>;
}
