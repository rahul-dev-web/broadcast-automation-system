import { RoomHudOverlay } from "@/components/broadcast/room-hud-overlay";

export default async function RoomOverlayPage({ searchParams }: { searchParams: Promise<{ tournament?: string; match?: string }> }) {
  const params = await searchParams;
  return <main className="broadcast-canvas"><RoomHudOverlay tournamentId={params.tournament ?? ""} matchNumber={Number(params.match ?? "1") || 1} /></main>;
}
