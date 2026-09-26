"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

function ScoreTable({ rows, title }: { rows: OverlayScore[]; title: string }) {
  return <div className="overlay-scoreboard">
    <div className="overlay-scoreboard-head"><span>{title}</span><span>PTS</span></div>
    <div className="overlay-scoreboard-rows">
      {rows.map((row, index) => <div className="overlay-score-row" key={row.teamId}>
        <span className="overlay-rank">{String(index + 1).padStart(2, "0")}</span>
        <span className="overlay-team-prefix">{row.prefix || `T${row.teamNumber}`}</span>
        <span className="overlay-team-name">{row.teamName || "Unnamed Team"}</span>
        <span className="overlay-kills">{row.kills}K</span>
        <span className="overlay-total">{row.totalPoints}</span>
      </div>)}
    </div>
  </div>;
}

function RosterStage({ teams, page }: { teams: OverlayTeam[]; page: 1 | 2 }) {
  const visible = teams.slice((page - 1) * 6, page * 6);
  return <section className="overlay-stage overlay-roster-stage">
    <div className="overlay-stage-header">
      <div><span className="overlay-kicker">TEAM ROSTER</span><h1>ROSTER <em>/{page}</em></h1></div>
      <span className="overlay-page-count">{visible.length} TEAMS</span>
    </div>
    <div className="overlay-roster-grid">
      {visible.map((team, index) => <article className="overlay-roster-card" key={team.id} style={{ "--delay": `${index * 55}ms` } as React.CSSProperties}>
        <div className="overlay-roster-team">
          {team.logoUrl ? <img src={team.logoUrl} alt="" className="overlay-team-logo" /> : <span className="overlay-team-logo fallback">{team.prefix.slice(0, 2) || `T${team.number}`}</span>}
          <div><b>{team.prefix || `TEAM ${team.number}`}</b><span>{team.name || "Unnamed Team"}</span></div>
          <small>#{String(team.number).padStart(2, "0")}</small>
        </div>
        <div className="overlay-player-list">
          {team.players.slice(0, 5).map(player => <div key={player.id} className={player.substitute ? "substitute" : ""}>
            <span>{String(player.slot).padStart(2, "0")}</span><strong>{player.inGameName || player.displayName || "Player"}</strong>{player.substitute && <i>SUB</i>}
          </div>)}
        </div>
      </article>)}
    </div>
  </section>;
}

function RoomStage({ teams, matchNumber, tournamentName }: { teams: OverlayTeam[]; matchNumber: number; tournamentName: string }) {
  return <section className="overlay-stage overlay-room-stage">
    <div className="overlay-room-heading">
      <div><span className="overlay-kicker">MATCH ROOM</span><h1>MATCH <em>{String(matchNumber).padStart(2, "0")}</em></h1><p>{tournamentName} · MANUAL FEED · {teams.length} TEAMS</p></div>
      <div className="overlay-room-status"><span className="pulse-dot" />ROOM READY</div>
    </div>
    <div className="overlay-room-grid">
      {teams.map((team, index) => <div className="overlay-room-team" key={team.id} style={{ "--delay": `${index * 35}ms` } as React.CSSProperties}>
        <span>{String(team.number).padStart(2, "0")}</span><strong>{team.prefix || `TEAM ${team.number}`}</strong><small>{team.name}</small><i>{team.players.filter(p => !p.substitute).length} PLAYERS</i>
      </div>)}
    </div>
    <div className="overlay-room-footer"><span>WAITING FOR MATCH START</span><b>LIVE PRODUCTION</b></div>
  </section>;
}

function LiveHud({ rows, matchNumber }: { rows: OverlayScore[]; matchNumber: number }) {
  const ranked = rankScores(rows);
  return <section className="overlay-stage overlay-live-stage">
    <div className="overlay-live-topbar"><div className="overlay-live-brand"><span className="live-dot" /> LIVE</div><strong>MATCH {String(matchNumber).padStart(2, "0")}</strong><span>MANUAL FEED</span></div>
    <div className="overlay-live-side">
      <span className="overlay-kicker">LIVE STANDINGS</span>
      {ranked.slice(0, 6).map((row, index) => <div className="overlay-live-row" key={row.teamId}><b>{index + 1}</b><strong>{row.prefix}</strong><span>{row.kills}K</span><em>{row.totalPoints}</em></div>)}
    </div>
    <div className="overlay-live-bottom">
      {ranked.map((row, index) => <div className={row.eliminationStatus === "ELIMINATED" ? "overlay-live-chip eliminated" : "overlay-live-chip"} key={row.teamId}>
        <b>{index + 1}</b><strong>{row.prefix}</strong><span>{row.kills}K</span><em>{row.totalPoints}</em>
      </div>)}
    </div>
  </section>;
}

function MatchResultStage({ rows, title, subtitle }: { rows: OverlayScore[]; title: string; subtitle: string }) {
  return <section className="overlay-stage overlay-result-stage">
    <div className="overlay-result-heading"><div><span className="overlay-kicker">{subtitle}</span><h1>{title}</h1></div><span className="result-stamp">OFFICIAL</span></div>
    <ScoreTable rows={rankScores(rows)} title="MATCH STANDINGS" />
  </section>;
}

function MatchPtStage({ rows, matchNumber }: { rows: OverlayScore[]; matchNumber: number }) {
  return <section className="overlay-stage overlay-pt-stage">
    <div className="overlay-pt-heading"><div><span className="overlay-kicker">MATCH POINT TABLE</span><h1>MATCH <em>{String(matchNumber).padStart(2, "0")}</em> PT</h1></div><span>PLACEMENT + KILL POINTS</span></div>
    <div className="overlay-pt-table">
      <div className="overlay-pt-table-head"><span>#</span><span>TEAM</span><span>PLACE</span><span>KILLS</span><span>POS PTS</span><span>KILL PTS</span><span>TOTAL</span></div>
      {rankScores(rows).map((row, index) => <div className="overlay-pt-table-row" key={row.teamId}>
        <span>{index + 1}</span><strong>{row.prefix}</strong><span>{row.placement ?? "—"}</span><span>{row.kills}</span><span>{row.positionPoints}</span><span>{row.killPoints}</span><b>{row.totalPoints}</b>
      </div>)}
    </div>
  </section>;
}

function OverallStage({ rows }: { rows: OverlayScore[] }) {
  return <section className="overlay-stage overlay-overall-stage">
    <div className="overlay-overall-heading"><div><span className="overlay-kicker">TOURNAMENT LEADERBOARD</span><h1>OVERALL <em>STANDINGS</em></h1></div><span>ALL MATCHES</span></div>
    <ScoreTable rows={rankScores(rows)} title="CUMULATIVE POINTS" />
  </section>;
}

function SimpleStage({ stage }: { stage: BroadcastStage }) {
  const title = stage === "THANK_YOU" ? "THANK YOU" : stage === "CLOSED" ? "BROADCAST CLOSED" : "BROADCAST READY";
  return <section className="overlay-stage overlay-simple-stage"><span className="overlay-kicker">BROADCAST AUTOMATION</span><h1>{title}</h1><p>{stage === "THANK_YOU" ? "Tournament presentation complete." : "Waiting for the next production cue."}</p></section>;
}

export function LiveOverlay({ tournamentId }: { tournamentId: string }) {
  const [state, setState] = useState<BroadcastStatePayload>({ ...initialState, tournamentId });
  const [connection, setConnection] = useState("CONNECTING");
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<OverlayData>({ tournamentName: "Broadcast", totalMatches: 1, teams: [], scores: [], overall: [], loading: true, error: "" });

  const loadOverlayData = useCallback(async (matchNumber: number) => {
    setData(current => ({ ...current, loading: true, error: "" }));
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

  if (!hydrated || data.loading) return <main className="broadcast-overlay broadcast-overlay-loading"><div className="overlay-loading-mark">BA</div><span>SYNCING BROADCAST FEED</span><i /></main>;
  if (data.error) return <main className="broadcast-overlay broadcast-overlay-error"><span className="overlay-kicker">BROADCAST FEED ERROR</span><h1>DATA SYNC FAILED</h1><p>{data.error}</p></main>;

  return <main className={`broadcast-overlay stage-${stage.toLowerCase()}`}>
    <div className="overlay-background-grid" /><div className="overlay-glow overlay-glow-a" /><div className="overlay-glow overlay-glow-b" />
    <header className="overlay-global-header">
      <div className="overlay-brand"><span className="overlay-brand-mark">BA</span><div><strong>BROADCAST AUTOMATION</strong><small>{data.tournamentName}</small></div></div>
      <div className="overlay-live-badge"><span className={isLive ? "live-dot" : "live-dot offline"} />{isLive ? "LIVE" : connection}</div>
    </header>
    <div className="overlay-transition-key" key={`${stage}-${state.updatedAt}`}>
      {stage === "ROSTER_1" || stage === "ROSTER_2" ? <RosterStage teams={data.teams} page={page} />
        : stage === "ROOM" ? <RoomStage teams={data.teams} matchNumber={state.matchNumber ?? 1} tournamentName={data.tournamentName} />
        : stage === "MATCH_LIVE" ? <LiveHud rows={currentScores} matchNumber={state.matchNumber ?? 1} />
        : stage === "MATCH_PT" ? <MatchPtStage rows={currentScores} matchNumber={state.matchNumber ?? 1} />
        : stage === "MATCH_REVIEW" ? <MatchResultStage rows={currentScores} title="MATCH REVIEW" subtitle="RESULT VERIFICATION" />
        : stage === "MATCH_VERIFIED" ? <MatchResultStage rows={currentScores} title="RESULT VERIFIED" subtitle="OFFICIAL MATCH RESULT" />
        : stage === "OVERALL" ? <OverallStage rows={overallScores} />
        : <SimpleStage stage={stage} />}
    </div>
    <footer className="overlay-global-footer"><span>MATCH {String(state.matchNumber ?? 1).padStart(2, "0")} / {String(data.totalMatches).padStart(2, "0")}</span><span>•</span><span>{stage.replaceAll("_", " ")}</span><span>•</span><span>OBS BROWSER SOURCE</span></footer>
  </main>;
}
