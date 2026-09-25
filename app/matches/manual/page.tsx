import { ManualMatchConsole } from "@/components/scoring/manual-match-console";

export default async function ManualMatchPage({ searchParams }: { searchParams: Promise<{ tournament?: string; match?: string }> }) {
  const params = await searchParams;
  const tournamentId = params.tournament ?? "";
  const matchNumber = Number(params.match ?? "1");

  if (!tournamentId) return <main className="shell"><section className="panel"><h1>Manual match console</h1><p className="muted">Missing tournament query parameter.</p></section></main>;

  return <main className="shell"><ManualMatchConsole tournamentId={tournamentId} matchNumber={Number.isFinite(matchNumber) && matchNumber > 0 ? matchNumber : 1} /></main>;
}
