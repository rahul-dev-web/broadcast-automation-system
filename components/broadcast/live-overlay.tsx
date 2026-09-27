"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { getBroadcastChannel, type BroadcastStatePayload } from "@/lib/realtime/broadcast";
import { supabase } from "@/lib/supabase/client";
import type { BroadcastStage } from "@/lib/types/tournament";

interface OverlayPlayer { id: string; slot: number; displayName: string; inGameName: string; substitute: boolean; }
interface OverlayTeam { id: string; number: number; name: string; prefix: string; logoUrl: string | null; players: OverlayPlayer[]; }
interface OverlayScore {
  teamId: string; teamNumber: number; teamName: string; prefix: string; kills: number;
  placement: number | null; killPoints: number; positionPoints: number; totalPoints: number;
  eliminationStatus: "ALIVE" | "ELIMINATED";
}
interface OverlayData {
  tournamentName: string; totalMatches: number; teams: OverlayTeam[];
  scores: OverlayScore[]; overall: OverlayScore[]; loading: boolean; error: string;
}

const initialState: BroadcastStatePayload = {
  stage: "ROOM", tournamentId: "", matchNumber: 1, inputMode: "MANUAL",
  currentPlayer: null, data: {}, updatedAt: new Date(0).toISOString(),
};

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : Number(value ?? fallback) || fallback;
}
function asText(value: unknown) { return typeof value === "string" ? value : ""; }
function normalizePayload(tournamentId: string, raw: Record<string, unknown> | null | undefined): BroadcastStatePayload {
  return {
    ...initialState, tournamentId,
    stage: typeof raw?.stage === "string" ? raw.stage as BroadcastStage : "ROOM",
    matchNumber: asNumber(raw?.matchNumber, 1),
    inputMode: raw?.inputMode === "OCR" ? "OCR" : "MANUAL",
    currentPlayer: raw?.currentPlayer && typeof raw.currentPlayer === "object"
      ? raw.currentPlayer as BroadcastStatePayload["currentPlayer"] : null,
    data: raw ?? {}, updatedAt: asText(raw?.updatedAt) || new Date(0).toISOString(),
  };
}
function rankScores(rows: OverlayScore[]) {
  return [...rows].sort((a, b) => (b.totalPoints - a.totalPoints) || (b.kills - a.kills) || ((a.placement ?? 99) - (b.placement ?? 99)));
}

function TeamLogo({ team }: { team: OverlayTeam }) {
  return team.logoUrl
    ? <img src={team.logoUrl} alt="" className="ff-team-logo" />
    : <span className="ff-team-logo ff-team-logo-fallback">{(team.prefix || `T${team.number}`).slice(0, 3)}</span>;
}

function BroadcastBrand({ tournamentName }: { tournamentName: string }) {
  return (
    <div className="ff-brand">
      <span className="ff-brand-mark">BA</span>
      <div><strong>BROADCAST AUTOMATION</strong><small>{tournamentName}</small></div>
    </div>
  );
}

function LineupStage({ teams, page }: { teams: OverlayTeam[]; page: 1 | 2 }) {
  const visible = teams.slice((page - 1) * 6, page * 6);
  return (
    <section className="ff-stage ff-lineup-stage">
      <div className="ff-corner ff-corner-tl" /><div className="ff-corner ff-corner-tr" />
      <div className="ff-corner ff-corner-bl" /><div className="ff-corner ff-corner-br" />
      <div className="ff-title-block">
        <span>GRAND FINALS · POINT RUSH</span>
        <h1>TEAM <em>LINEUP</em></h1>
        <i>{String(page).padStart(2, "0")} / 02</i>
      </div>
      <div className="ff-lineup-grid">
        {visible.map((team, index) => (
          <article className="ff-lineup-card" key={team.id} style={{ "--delay": `${index * 70}ms` } as CSSProperties}>
            <div className="ff-lineup-card-head">
              <TeamLogo team={team} />
              <div><strong>{team.name || `TEAM ${team.number}`}</strong><span>{team.prefix || `T${team.number}`}</span></div>
              <b>#{String(team.number).padStart(2, "0")}</b>
            </div>
            <div className="ff-player-strip">
              {team.players.slice(0, 5).map(player => (
                <div className="ff-player-chip" key={player.id}>
                  <span>{String(player.slot).padStart(2, "0")}</span>
                  <strong>{player.inGameName || player.displayName || "PLAYER"}</strong>
                  {player.substitute && <i>SUB</i>}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="ff-stage-footer"><span>OFFICIAL TOURNAMENT BROADCAST</span><b>LIVE PRODUCTION</b></div>
    </section>
  );
}

function RoomStage({ teams, matchNumber, tournamentName }: { teams: OverlayTeam[]; matchNumber: number; tournamentName: string }) {
  return (
    <section className="ff-stage ff-room-stage">
      <div className="ff-room-orbit" />
      <div className="ff-room-copy">
        <span className="ff-overline">MATCH {String(matchNumber).padStart(2, "0")} · {tournamentName}</span>
        <h1>GET<br /><em>READY</em></h1>
        <p>ROOM IS OPEN · {teams.length} TEAMS REGISTERED · {String(matchNumber).padStart(2, "0")} / LIVE SERIES</p>
        <div className="ff-ready-pill"><span /> MATCH READY</div>
      </div>
      <div className="ff-room-grid">
        {teams.map((team, index) => (
          <div className="ff-room-team" key={team.id} style={{ "--delay": `${index * 35}ms` } as CSSProperties}>
            <b>{String(team.number).padStart(2, "0")}</b><strong>{team.prefix || `T${team.number}`}</strong><span>{team.name}</span>
          </div>
        ))}
      </div>
      <div className="ff-action-bar"><span>ACTION STARTS WHEN THE MATCH GOES LIVE</span><strong>POINT RUSH</strong></div>
    </section>
  );
}

function LiveHud({
  rows, matchNumber, currentPlayer, teams, statusLabel,
}: {
  rows: OverlayScore[]; matchNumber: number;
  currentPlayer: BroadcastStatePayload["currentPlayer"]; teams: OverlayTeam[];
  statusLabel?: string;
}) {
  const ranked = rankScores(rows);
  const focusedTeam = currentPlayer ? teams.find(team => team.id === currentPlayer.teamId) : null;
  return (
    <section className="ff-stage ff-live-stage">
      <div className="ff-live-top">
        <div className="ff-live-match"><span className="ff-live-dot" /> MATCH {String(matchNumber).padStart(2, "0")}</div>
        <div className="ff-live-center">GRAND FINALS <b>·</b> POINT RUSH</div>
        <div className="ff-live-feed">{currentPlayer ? "PLAYER FOCUS" : (statusLabel ?? "LIVE")} <span /></div>
      </div>

      <aside className="ff-standings">
        <div className="ff-standings-title"><strong>GAME STANDINGS</strong><span>ALIVE · ELIMS</span></div>
        <div className="ff-standings-legend"><span className="alive-box" /> ALIVE <span className="elim-box" /> ELIMINATED</div>
        {ranked.slice(0, 12).map((row, index) => (
          <div className={`ff-standing-row ${row.eliminationStatus === "ELIMINATED" ? "is-eliminated" : ""}`} key={row.teamId}>
            <b>{index + 1}</b>
            <strong>{row.prefix || `T${row.teamNumber}`}</strong>
            <span className="ff-bars">{[0,1,2,3].map(bar => <i key={bar} />)}</span>
            <em>{row.kills}</em>
          </div>
        ))}
      </aside>

      {currentPlayer && (
        <div className="ff-player-focus">
          <div className="ff-focus-accent" />
          <div className="ff-focus-team">{focusedTeam?.prefix || `T${currentPlayer.teamNumber}`} <span>PLAYER FOCUS</span></div>
          <strong>{currentPlayer.inGameName || currentPlayer.registeredName}</strong>
          <div className="ff-focus-meta"><span>TEAM {String(currentPlayer.teamNumber).padStart(2, "0")}</span><span>·</span><span>LIVE</span></div>
        </div>
      )}

      <div className="ff-live-score-strip">
        {ranked.map((row, index) => (
          <div className={`ff-live-score ${row.eliminationStatus === "ELIMINATED" ? "is-eliminated" : ""}`} key={row.teamId}>
            <b>{index + 1}</b><strong>{row.prefix || `T${row.teamNumber}`}</strong><span>{row.kills}K</span><em>{row.totalPoints}</em>
          </div>
        ))}
      </div>
      <div className="ff-live-brand-watermark">FF <small>OFFICIAL BROADCAST</small></div>
    </section>
  );
}

function BooyahStage({ rows, matchNumber }: { rows: OverlayScore[]; matchNumber: number }) {
  const ranked = rankScores(rows);
  const winner = ranked.find(row => row.placement === 1) ?? ranked[0];
  return (
    <section className="ff-stage ff-booyah-stage">
      <div className="ff-booyah-flare" />
      <div className="ff-booyah-word">BOOYAH!</div>
      <div className="ff-booyah-sub">MATCH {String(matchNumber).padStart(2, "0")} · OFFICIAL RESULT</div>
      <div className="ff-winner-card">
        <div className="ff-winner-rank">#01</div>
        <div><span>WINNER</span><strong>{winner?.prefix || "TBD"}</strong><small>{winner?.teamName || "MATCH WINNER"}</small></div>
        <div className="ff-winner-stats"><b>{winner?.totalPoints ?? 0}<small>PTS</small></b><b>{winner?.kills ?? 0}<small>ELIMS</small></b></div>
      </div>
      <div className="ff-result-note">{winner?.teamName || "POINT RUSH · GRAND FINALS"}</div>
    </section>
  );
}

function MatchResultStage({ rows, title, subtitle, matchNumber }: { rows: OverlayScore[]; title: string; subtitle: string; matchNumber: number }) {
  const ranked = rankScores(rows);
  return (
    <section className="ff-stage ff-results-stage">
      <div className="ff-results-heading">
        <div><span>{subtitle}</span><h1>{title}</h1></div>
        <b>GAME {String(matchNumber).padStart(2, "0")}</b>
      </div>
      <div className="ff-results-table">
        <div className="ff-results-head"><span>#</span><span>TEAM</span><span>PLACE</span><span>ELIMS</span><span>PTS</span></div>
        {ranked.map((row, index) => (
          <div className={`ff-results-row ${index === 0 ? "top-row" : ""}`} key={row.teamId}>
            <b>{String(index + 1).padStart(2, "0")}</b><strong>{row.prefix}</strong><span>{row.placement ?? "—"}</span><span>{row.kills}</span><em>{row.totalPoints}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

function OverallStage({ rows }: { rows: OverlayScore[] }) {
  const ranked = rankScores(rows);
  return (
    <section className="ff-stage ff-overall-stage">
      <div className="ff-overall-title"><span>GRAND FINALS · POINT RUSH</span><h1>GAME <em>STANDINGS</em></h1><b>OVERALL</b></div>
      <div className="ff-overall-table">
        {ranked.map((row, index) => (
          <div className={`ff-overall-row ${index < 3 ? "podium-row" : ""}`} key={row.teamId}>
            <b>{String(index + 1).padStart(2, "0")}</b><strong>{row.prefix}</strong><span>{row.teamName || "TEAM"}</span><i>{row.kills} ELIMS</i><em>{row.totalPoints}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

function SimpleStage({ stage }: { stage: BroadcastStage }) {
  const title = stage === "THANK_YOU" ? "FORGE YOUR LEGACY" : stage === "CLOSED" ? "BROADCAST CLOSED" : "BROADCAST READY";
  const kicker = stage === "THANK_YOU" ? "THANK YOU FOR WATCHING" : "OFFICIAL TOURNAMENT BROADCAST";
  return (
    <section className="ff-stage ff-simple-stage"><span>{kicker}</span><h1>{title}</h1><p>{stage === "THANK_YOU" ? "Tournament presentation complete." : "Waiting for the next production cue."}</p></section>
  );
}

export function LiveOverlay({ tournamentId }: { tournamentId: string }) {
  const [state, setState] = useState<BroadcastStatePayload>({ ...initialState, tournamentId });
  const [connection, setConnection] = useState("CONNECTING");
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<OverlayData>({ tournamentName: "Broadcast", totalMatches: 1, teams: [], scores: [], overall: [], loading: true, error: "" });
  const lastSessionUpdateRef = useRef("");

  const loadOverlayData = useCallback(async (matchNumber: number) => {
    setData(current => ({ ...current, loading: current.teams.length === 0, error: "" }));
    try {
      const [tournamentResult, teamsResult, matchResult] = await Promise.all([
        supabase.from("tournaments").select("name, total_matches").eq("id", tournamentId).single(),
        supabase.from("teams").select("id, team_number, team_name, team_prefix, logo_url").eq("tournament_id", tournamentId).eq("is_active", true).order("team_number"),
        supabase.from("matches").select("id, match_number").eq("tournament_id", tournamentId).eq("match_number", matchNumber).maybeSingle(),
      ]);
      if (tournamentResult.error) throw tournamentResult.error;
      if (teamsResult.error) throw teamsResult.error;
      if (matchResult.error) throw matchResult.error;

      const teams = (teamsResult.data ?? []).map(team => ({
        id: team.id, number: team.team_number, name: team.team_name ?? "", prefix: team.team_prefix ?? "", logoUrl: team.logo_url ?? null, players: [],
      })) as OverlayTeam[];

      const teamIds = teams.map(team => team.id);
      if (teamIds.length) {
        const playersResult = await supabase.from("players").select("id, team_id, slot_number, display_name, in_game_name, is_substitute").in("team_id", teamIds).order("slot_number");
        if (playersResult.error) throw playersResult.error;
        for (const player of playersResult.data ?? []) {
          const team = teams.find(item => item.id === player.team_id);
          if (team) team.players.push({ id: player.id, slot: player.slot_number, displayName: player.display_name ?? "", inGameName: player.in_game_name ?? "", substitute: player.is_substitute });
        }
      }

      let scores: OverlayScore[] = [];
      if (matchResult.data?.id) {
        const scoreResult = await supabase.from("match_team_state").select("team_id, kills, placement, kill_points, position_points, total_points, elimination_status").eq("match_id", matchResult.data.id);
        if (scoreResult.error) throw scoreResult.error;
        scores = (scoreResult.data ?? []).map(row => {
          const team = teams.find(item => item.id === row.team_id);
          return {
            teamId: row.team_id, teamNumber: team?.number ?? 0, teamName: team?.name ?? "", prefix: team?.prefix || `T${team?.number ?? "?"}`,
            kills: row.kills ?? 0, placement: row.placement, killPoints: row.kill_points ?? 0, positionPoints: row.position_points ?? 0, totalPoints: row.total_points ?? 0, eliminationStatus: row.elimination_status ?? "ALIVE",
          };
        });
      }

      const matchListResult = await supabase.from("matches").select("id, match_number").eq("tournament_id", tournamentId).order("match_number");
      if (matchListResult.error) throw matchListResult.error;
      let overall = [...scores];
      if ((matchListResult.data ?? []).length) {
        const statesResult = await supabase.from("match_team_state").select("match_id, team_id, kills, total_points").in("match_id", (matchListResult.data ?? []).map(match => match.id));
        if (statesResult.error) throw statesResult.error;
        const totals = new Map<string, { kills: number; points: number }>();
        for (const row of statesResult.data ?? []) {
          const current = totals.get(row.team_id) ?? { kills: 0, points: 0 };
          current.kills += row.kills ?? 0; current.points += row.total_points ?? 0; totals.set(row.team_id, current);
        }
        overall = teams.map(team => ({
          teamId: team.id, teamNumber: team.number, teamName: team.name, prefix: team.prefix || `T${team.number}`, kills: totals.get(team.id)?.kills ?? 0,
          placement: null, killPoints: 0, positionPoints: 0, totalPoints: totals.get(team.id)?.points ?? 0, eliminationStatus: "ALIVE",
        }));
      }

      setData({ tournamentName: tournamentResult.data.name, totalMatches: tournamentResult.data.total_matches, teams, scores, overall, loading: false, error: "" });
    } catch (caught) {
      setData(current => ({ ...current, loading: false, error: caught instanceof Error ? caught.message : "Overlay data could not be loaded." }));
    }
  }, [tournamentId]);

  const applyRealtime = useCallback((payload: BroadcastStatePayload) => {
    if (payload.tournamentId !== tournamentId) return;
    if (new Date(payload.updatedAt).getTime() <= new Date(lastSessionUpdateRef.current || "1970-01-01").getTime()) return;
    lastSessionUpdateRef.current = payload.updatedAt;
    setState(current => new Date(payload.updatedAt).getTime() >= new Date(current.updatedAt).getTime() ? payload : current);
    void loadOverlayData(payload.matchNumber ?? 1);
  }, [loadOverlayData, tournamentId]);

  useEffect(() => {
    let active = true;
    const channel = getBroadcastChannel(tournamentId);
    channel.on("broadcast", { event: "state" }, message => { if (active) applyRealtime(message.payload as BroadcastStatePayload); });
    channel.subscribe(status => { if (active) setConnection(status); });

    void (async () => {
      const { data: session, error } = await supabase.from("broadcast_sessions").select("state, state_payload, updated_at").eq("tournament_id", tournamentId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!active) return;
      if (!error && session) {
        const payload = { ...((session.state_payload ?? {}) as Record<string, unknown>), stage: session.state, updatedAt: session.updated_at };
        const next = normalizePayload(tournamentId, payload);
        lastSessionUpdateRef.current = next.updatedAt;
        setState(next);
        await loadOverlayData(next.matchNumber ?? 1);
      } else {
        await loadOverlayData(1);
      }
      if (active) setHydrated(true);
    })();

    return () => { active = false; void channel.unsubscribe(); };
  }, [applyRealtime, loadOverlayData, tournamentId]);

  const stage = state.stage;
  const page = asNumber(state.data?.page, stage === "ROSTER_2" ? 2 : 1) === 2 ? 2 : 1;
  const currentScores = useMemo(() => rankScores(data.scores), [data.scores]);
  const overallScores = useMemo(() => rankScores(data.overall), [data.overall]);
  const isLive = connection === "SUBSCRIBED";

  useEffect(() => {
    if (!hydrated) return;

    // Realtime is the fast path. This lightweight session poll is the fallback
    // that keeps the browser source moving even if one broadcast event is missed.
    const timer = window.setInterval(async () => {
      try {
        const { data: session } = await supabase
          .from("broadcast_sessions")
          .select("state, state_payload, updated_at")
          .eq("tournament_id", tournamentId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!session || session.updated_at === lastSessionUpdateRef.current) return;

        const payload = { ...((session.state_payload ?? {}) as Record<string, unknown>), stage: session.state, updatedAt: session.updated_at };
        const next = normalizePayload(tournamentId, payload);
        lastSessionUpdateRef.current = next.updatedAt;
        setState(next);
        void loadOverlayData(next.matchNumber ?? 1);
      } catch {
        // Realtime remains active; a temporary polling failure should not blank the overlay.
      }
    }, 1200);

    return () => window.clearInterval(timer);
  }, [hydrated, loadOverlayData, tournamentId]);

  if (!hydrated || data.loading) return <main className="broadcast-overlay broadcast-overlay-loading"><div className="ff-loading-mark">BA</div><span>SYNCING BROADCAST FEED</span><i /></main>;
  if (data.error) return <main className="broadcast-overlay broadcast-overlay-error"><span>DATA SYNC FAILED</span><h1>BROADCAST FEED ERROR</h1><p>{data.error}</p></main>;

  return (
    <main className={`broadcast-overlay ff-broadcast-root stage-${stage.toLowerCase()}`}>
      <div className="ff-transition-layer" key={stage}><span /><i /><b>{stage.replaceAll("_", " ")}</b></div>
      <div className="ff-bg" />
      <header className="ff-global-header"><BroadcastBrand tournamentName={data.tournamentName} /><div className="ff-connection"><span className={isLive ? "ff-live-dot" : "ff-live-dot ff-offline"} />{isLive ? "LIVE" : connection}</div></header>
      <div className="ff-stage-mount" key={stage}>
        {stage === "ROSTER_1" || stage === "ROSTER_2" ? <LineupStage teams={data.teams} page={page} />
          : stage === "ROOM" ? <RoomStage teams={data.teams} matchNumber={state.matchNumber ?? 1} tournamentName={data.tournamentName} />
          : stage === "MATCH_LIVE" ? <LiveHud rows={currentScores} matchNumber={state.matchNumber ?? 1} currentPlayer={state.currentPlayer} teams={data.teams} />
          : stage === "MATCH_VERIFIED" ? <BooyahStage rows={currentScores} matchNumber={state.matchNumber ?? 1} />
          : stage === "MATCH_PT" ? <MatchResultStage rows={currentScores} title="GAME STANDINGS" subtitle="OFFICIAL MATCH RESULT" matchNumber={state.matchNumber ?? 1} />
          : stage === "MATCH_REVIEW" ? <LiveHud rows={currentScores} matchNumber={state.matchNumber ?? 1} currentPlayer={null} teams={data.teams} statusLabel="MATCH COMPLETE" />
          : stage === "OVERALL" ? <OverallStage rows={overallScores} />
          : <SimpleStage stage={stage} />}
      </div>
      {stage !== "MATCH_LIVE" && stage !== "MATCH_REVIEW" && <footer className="ff-global-footer"><span>GAME {String(state.matchNumber ?? 1).padStart(2, "0")} / {String(data.totalMatches).padStart(2, "0")}</span><i>•</i><span>{stage.replaceAll("_", " ")}</span><i>•</i><span>OBS BROWSER SOURCE</span></footer>}
    </main>
  );
}
