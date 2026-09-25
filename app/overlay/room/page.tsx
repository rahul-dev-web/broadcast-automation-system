"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RoomHudOverlay } from "@/components/broadcast/room-hud-overlay";

function RoomOverlayContent() {
  const params = useSearchParams();
  return <main className="broadcast-canvas"><RoomHudOverlay tournamentId={params.get("tournament") ?? ""} matchNumber={Number(params.get("match") ?? "1") || 1} /></main>;
}

export default function RoomOverlayPage() {
  return <Suspense fallback={<main className="broadcast-canvas"><div className="broadcast-stage room-stage"><span className="broadcast-kicker">ROOM HUD</span><h2>Loading…</h2></div></main>}><RoomOverlayContent /></Suspense>;
}
