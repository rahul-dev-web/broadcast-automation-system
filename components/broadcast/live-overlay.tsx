"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { getBroadcastChannel, type BroadcastStatePayload } from "@/lib/realtime/broadcast";
import { createBroadcastClient } from "@/lib/supabase/client";
import { designCssVariables, normalizeDesign, type BroadcastDesignConfig } from "@/lib/broadcast-design";
import type { BroadcastStage } from "@/lib/types/tournament";

interface OverlayPlayer { id: string; slot: number; displayName: string; inGameName: string; substitute: boolean; }
interface OverlayTeam { id: string; number: number; name: string; prefix: string; logoUrl: string | null; players: OverlayPlayer[]; }
interface OverlayScore {
  teamId: string; teamNumber: number; teamName: string; prefix: string; kills: number;
  placement: number | null; killPoints: number; positionPoints: number; totalPoints: number;
  eliminationStatus: "ALIVE" | "ELIMINATED";
}
interface DesignRuntimeAsset { slot: string; mimeType: string | null; url: string; }
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

function BroadcastBrand({ tournamentName, logoUrl }: { tournamentName: string; logoUrl?: string }) {
  return (
    <div className="ff-brand">
      {logoUrl ? <img src={logoUrl} alt="" className="ff-brand-mark ff-design-logo" /> : <span className="ff-brand-mark">BA</span>}
      <div><strong>{tournamentName || "TOURNAMENT"}</strong><small>OFFICIAL TOURNAMENT BROADCAST</small></div>
    </div>
  );
}

function LineupStage({ teams, page, tournamentName }: { teams: OverlayTeam[]; page: 1 | 2; tournamentName: string }) {
  const visible = teams.slice((page - 1) * 6, page * 6);
  return (
    <section className="ff-stage ff-lineup-stage">
      <div className="ff-corner ff-corner-tl" /><div className="ff-corner ff-corner-tr" />
      <div className="ff-corner ff-corner-bl" /><div className="ff-corner ff-corner-br" />
      <div className="ff-title-block">
        <span>{tournamentName}</span>
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
  rows, matchNumber, currentPlayer, teams, tournamentName, statusLabel,
}: {
  rows: OverlayScore[]; matchNumber: number;
  currentPlayer: BroadcastStatePayload["currentPlayer"]; teams: OverlayTeam[];
  tournamentName: string; statusLabel?: string;
}) {
  const ranked = [...rows].sort((a, b) => (b.kills - a.kills) || (a.teamNumber - b.teamNumber));
  const focusedTeam = currentPlayer ? teams.find(team => team.id === currentPlayer.teamId) : null;
  return (
    <section className="ff-stage ff-live-stage">
      <div className="ff-live-top">
        <div className="ff-live-match"><span className="ff-live-dot" /> MATCH {String(matchNumber).padStart(2, "0")}</div>
        <div className="ff-live-center">{tournamentName}</div>
        <div className="ff-live-feed">{currentPlayer ? "PLAYER FOCUS" : (statusLabel ?? "LIVE")} <span /></div>
      </div>

      <aside className="ff-standings">
        <div className="ff-standings-title"><strong>GAME STANDINGS</strong><span>KILLS</span></div>
        {ranked.slice(0, 12).map((row, index) => (
          <div className={`ff-standing-row ${row.eliminationStatus === "ELIMINATED" ? "is-eliminated" : ""}`} key={row.teamId}>
            <b>{index + 1}</b>
            <strong>{row.prefix || `T${row.teamNumber}`}</strong>
            <em>{row.kills} K</em>
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
            <b>{index + 1}</b><strong>{row.prefix || `T${row.teamNumber}`}</strong><span>{row.kills} KILLS</span>
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

function OverallStage({ rows, tournamentName }: { rows: OverlayScore[]; tournamentName: string }) {
  const ranked = rankScores(rows);
  return (
    <section className="ff-stage ff-overall-stage">
      <div className="ff-overall-title"><span>{tournamentName}</span><h1>GAME <em>STANDINGS</em></h1><b>OVERALL</b></div>
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

function CustomMediaStage({ asset, label }: { asset: DesignRuntimeAsset; label: string }) {
  const isVideo = asset.mimeType?.startsWith("video/");

  return (
    <section
      className="ff-stage ff-custom-media-stage"
      aria-label={label}
      style={{ position: "relative", width: "100%", minHeight: "100vh", height: "100vh", padding: 0, overflow: "hidden" }}
    >
      {isVideo ? (
        <video
          src={asset.url}
          autoPlay
          muted
          loop
          playsInline
          className="ff-custom-stage-media"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <img
          src={asset.url}
          alt=""
          className="ff-custom-stage-media"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}
    </section>
  );
}

function StartingStage({ introAsset }: { introAsset?: DesignRuntimeAsset }) {
  if (!introAsset) {
    return <SimpleStage stage="AUTOMATION_STARTED" />;
  }

  return <CustomMediaStage asset={introAsset} label="Broadcast intro" />;
}

export function LiveOverlay({ tournamentId, token }: { tournamentId: string; token: string }) {
  const overlaySupabase = useMemo(() => createBroadcastClient(token), [token]);
  const [state, setState] = useState<BroadcastStatePayload>({ ...initialState, tournamentId });
  const [connection, setConnection] = useState("CONNECTING");
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<OverlayData>({ tournamentName: "Broadcast", totalMatches: 1, teams: [], scores: [], overall: [], loading: true, error: "" });
  const [designConfig, setDesignConfig] = useState<BroadcastDesignConfig | null>(null);
  const [designStyle, setDesignStyle] = useState("MINIMAL");
  const [designAssets, setDesignAssets] = useState<DesignRuntimeAsset[]>([]);
  const lastSessionUpdateRef = useRef("");

  const loadOverlayData = useCallback(async (matchNumber: number) => {
    setData(current => ({ ...current, loading: current.teams.length === 0, error: "" }));

    try {
      // OBS is an unauthenticated public client. Validate the per-tournament
      // broadcast token inside Postgres and return one complete read-only snapshot.
      const { data: snapshot, error: snapshotError } = await overlaySupabase.rpc(
        "get_public_broadcast_snapshot",
        {
          p_tournament_id: tournamentId,
          p_token: token,
          p_match_number: matchNumber,
        },
      );

      if (snapshotError) throw snapshotError;
      if (!snapshot || typeof snapshot !== "object") {
        throw new Error("Broadcast snapshot was empty.");
      }

      const raw = snapshot as Record<string, unknown>;
      const tournament = (raw.tournament ?? {}) as Record<string, unknown>;
      const session = (raw.session ?? {}) as Record<string, unknown>;
      const rawTeams = Array.isArray(raw.teams) ? raw.teams : [];
      const teams = rawTeams.map((teamValue) => {
        const team = (teamValue ?? {}) as Record<string, unknown>;
        const rawPlayers = Array.isArray(team.players) ? team.players : [];
        return {
          id: asText(team.id),
          number: asNumber(team.team_number),
          name: asText(team.team_name),
          prefix: asText(team.team_prefix),
          logoUrl: typeof team.logo_url === "string" ? team.logo_url : null,
          players: rawPlayers.map((playerValue) => {
            const player = (playerValue ?? {}) as Record<string, unknown>;
            return {
              id: asText(player.id),
              slot: asNumber(player.slot_number),
              displayName: asText(player.display_name),
              inGameName: asText(player.in_game_name),
              substitute: Boolean(player.is_substitute),
            };
          }),
        };
      }) as OverlayTeam[];

      const teamById = new Map(teams.map(team => [team.id, team]));
      const rawScores = Array.isArray(raw.scores) ? raw.scores : [];
      const scores = rawScores.map((scoreValue) => {
        const row = (scoreValue ?? {}) as Record<string, unknown>;
        const team = teamById.get(asText(row.team_id));
        return {
          teamId: asText(row.team_id),
          teamNumber: team?.number ?? 0,
          teamName: team?.name ?? "",
          prefix: team?.prefix || `T${team?.number ?? "?"}`,
          kills: asNumber(row.kills),
          placement: row.placement == null ? null : asNumber(row.placement),
          killPoints: asNumber(row.kill_points),
          positionPoints: asNumber(row.position_points),
          totalPoints: asNumber(row.total_points),
          eliminationStatus: row.elimination_status === "ELIMINATED" ? "ELIMINATED" : "ALIVE",
        };
      }) as OverlayScore[];

      const rawOverall = Array.isArray(raw.overall) ? raw.overall : [];
      const overall = rawOverall.map((rowValue) => {
        const row = (rowValue ?? {}) as Record<string, unknown>;
        const teamNumber = asNumber(row.team_number);
        return {
          teamId: asText(row.team_id),
          teamNumber,
          teamName: asText(row.team_name),
          prefix: asText(row.team_prefix) || `T${teamNumber || "?"}`,
          kills: asNumber(row.kills),
          placement: null,
          killPoints: 0,
          positionPoints: 0,
          totalPoints: asNumber(row.total_points),
          eliminationStatus: "ALIVE",
        };
      }) as OverlayScore[];

      const design = (raw.design ?? {}) as Record<string, unknown>;
      const designConfigRaw = design.config;
      if (designConfigRaw && typeof designConfigRaw === "object") {
        const nextDesign = normalizeDesign(designConfigRaw as Partial<BroadcastDesignConfig>);
        setDesignConfig(nextDesign);
        setDesignStyle(nextDesign.layout.style);
      } else {
        setDesignConfig(null);
        setDesignStyle("MINIMAL");
      }

      const rawAssets = Array.isArray(design.assets) ? design.assets : [];
      setDesignAssets(rawAssets.map((assetValue) => {
        const asset = (assetValue ?? {}) as Record<string, unknown>;
        const config = asset.config && typeof asset.config === "object"
          ? asset.config as Record<string, unknown>
          : null;
        const publicUrl = typeof config?.publicUrl === "string"
          ? config.publicUrl
          : overlaySupabase.storage.from("broadcast-assets").getPublicUrl(asText(asset.storage_path)).data.publicUrl;
        return {
          slot: asText(asset.slot),
          mimeType: typeof asset.mime_type === "string" ? asset.mime_type : null,
          url: publicUrl,
        };
      }).filter(asset => Boolean(asset.slot && asset.url)));

      const sessionPayload = session.state_payload && typeof session.state_payload === "object"
        ? session.state_payload as Record<string, unknown>
        : {};
      const sessionStage = typeof session.state === "string" ? session.state as BroadcastStage : null;
      const sessionUpdatedAt = asText(session.updated_at);
      if (sessionStage && sessionUpdatedAt) {
        const next = normalizePayload(tournamentId, {
          ...sessionPayload,
          stage: sessionStage,
          matchNumber: asNumber(sessionPayload.matchNumber, matchNumber),
          updatedAt: sessionUpdatedAt,
        });
        if (new Date(next.updatedAt).getTime() >= new Date(lastSessionUpdateRef.current || "1970-01-01").getTime()) {
          lastSessionUpdateRef.current = next.updatedAt;
          setState(current =>
            new Date(next.updatedAt).getTime() >= new Date(current.updatedAt).getTime() ? next : current,
          );
        }
      }

      setData({
        tournamentName: asText(tournament.name) || "Broadcast",
        totalMatches: asNumber(tournament.total_matches, 1),
        teams,
        scores,
        overall,
        loading: false,
        error: "",
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Broadcast snapshot could not be loaded.";
      const friendly = /Invalid broadcast token/i.test(message)
        ? "OBS URL is no longer valid. Generate a fresh OBS URL from the tournament dashboard."
        : message;
      setData(current => ({
        ...current,
        loading: false,
        error: friendly,
      }));
    }
  }, [overlaySupabase, token, tournamentId]);

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

    channel.on("broadcast", { event: "state" }, message => {
      if (active) applyRealtime(message.payload as BroadcastStatePayload);
    });
    channel.subscribe(status => {
      if (active) setConnection(status);
    });

    void loadOverlayData(state.matchNumber ?? 1).then(() => {
      if (active) setHydrated(true);
    });

    return () => {
      active = false;
      void channel.unsubscribe();
    };
  }, [applyRealtime, loadOverlayData, state.matchNumber, tournamentId]);


  const stage = state.stage;
  const page = asNumber(state.data?.page, stage === "ROSTER_2" ? 2 : 1) === 2 ? 2 : 1;
  const currentScores = useMemo(() => rankScores(data.scores), [data.scores]);
  const overallScores = useMemo(() => rankScores(data.overall), [data.overall]);
  const isLive = connection === "SUBSCRIBED";

  useEffect(() => {
    if (!hydrated) return;

    // Realtime is the fast path. Token-authenticated snapshot polling is the
    // durable fallback for OBS reconnects and missed broadcast events.
    const timer = window.setInterval(() => {
      void loadOverlayData(state.matchNumber ?? 1);
    }, 900);

    return () => window.clearInterval(timer);
  }, [hydrated, loadOverlayData, state.matchNumber]);


  if (!hydrated || data.loading) return <main className="broadcast-overlay broadcast-overlay-loading"><div className="ff-loading-mark">BA</div><span>SYNCING BROADCAST FEED</span><i /></main>;
  if (data.error) return <main className="broadcast-overlay broadcast-overlay-error"><span>DATA SYNC FAILED</span><h1>BROADCAST FEED ERROR</h1><p>{data.error}</p></main>;

  const backgroundSlot = stage === "ROSTER_1" || stage === "ROSTER_2" ? "background_roster"
    : stage === "ROOM" ? "background_room"
    : stage === "MATCH_LIVE" || stage === "MATCH_REVIEW" ? "background_live"
    : stage === "MATCH_VERIFIED" || stage === "MATCH_PT" ? "background_result"
    : stage === "OVERALL" ? "background_overall"
    : stage === "THANK_YOU" ? "outro_thank_you"
    : null;
  const backgroundAsset = backgroundSlot ? designAssets.find(asset => asset.slot === backgroundSlot) : undefined;
  const introAsset = designAssets.find(asset => asset.slot === "intro_starting");
  const outroAsset = designAssets.find(asset => asset.slot === "outro_thank_you");
  const broadcastLogo = designAssets.find(asset => asset.slot === "logo_broadcast");
  const headingFont = designAssets.find(asset => asset.slot === "font_heading" || asset.slot === "font_primary");
  const bodyFont = designAssets.find(asset => asset.slot === "font_body" || asset.slot === "font_primary");
  const designPolicy = designConfig?.stageDefaults[stage];
  const allowBackground = designPolicy?.background !== "TRANSPARENT";
  const designClass = designStyle === "ANGULAR" ? "design-angular-arena"
    : designStyle === "CINEMATIC" ? "design-championship-cinematic"
    : designStyle === "GRID" ? "design-future-grid"
    : "design-minimal";
  const runtimeStyle = {
    ...designCssVariables(designConfig, stage),
    ...(headingFont ? { "--theme-heading-font": "BroadcastDesignHeading" } : {}),
    ...(bodyFont ? { "--theme-body-font": "BroadcastDesignBody" } : {}),
  } as CSSProperties;

  const hasCustomIntro = stage === "AUTOMATION_STARTED" && Boolean(introAsset);
  const hasCustomOutro = stage === "THANK_YOU" && Boolean(outroAsset);

  return (
    <main className={`broadcast-overlay ff-broadcast-root stage-${stage.toLowerCase()} ${designClass}`} style={runtimeStyle}>
      {(headingFont || bodyFont) && <style>{`
        @font-face{font-family:BroadcastDesignHeading;src:url("${headingFont?.url ?? bodyFont?.url}") format("woff2");font-display:swap;}
        @font-face{font-family:BroadcastDesignBody;src:url("${bodyFont?.url ?? headingFont?.url}") format("woff2");font-display:swap;}
      `}</style>}
      {!hasCustomIntro && !hasCustomOutro && <div className="ff-transition-layer" key={stage}><span /><i /><b>{stage.replaceAll("_", " ")}</b></div>}

      {hasCustomIntro ? (
        <div className="ff-starting-intro-mount">
          <video
            src={introAsset?.url}
            autoPlay
            muted
            loop
            playsInline
            className="ff-starting-intro"
          />
        </div>
      ) : hasCustomOutro ? (
        <CustomMediaStage asset={outroAsset!} label="Broadcast outro" />
      ) : (
        <>
          {backgroundAsset && allowBackground && backgroundAsset.mimeType?.startsWith("video/")
            ? <video className="ff-bg ff-design-background" src={backgroundAsset.url} autoPlay muted loop playsInline />
            : backgroundAsset && allowBackground
              ? <img className="ff-bg ff-design-background" src={backgroundAsset.url} alt="" />
              : <div className="ff-bg" />}

          <header className="ff-global-header"><BroadcastBrand tournamentName={data.tournamentName} logoUrl={broadcastLogo?.url} /><div className="ff-connection"><span className={isLive ? "ff-live-dot" : "ff-live-dot ff-offline"} />{isLive ? "LIVE" : connection}</div></header>

          <div className="ff-stage-mount" key={stage}>
            {stage === "ROSTER_1" || stage === "ROSTER_2" ? <LineupStage teams={data.teams} page={page} tournamentName={data.tournamentName} />
              : stage === "ROOM" ? <RoomStage teams={data.teams} matchNumber={state.matchNumber ?? 1} tournamentName={data.tournamentName} />
              : stage === "MATCH_LIVE" ? <LiveHud rows={currentScores} matchNumber={state.matchNumber ?? 1} currentPlayer={state.currentPlayer} teams={data.teams} tournamentName={data.tournamentName} />
              : stage === "MATCH_VERIFIED" ? <BooyahStage rows={currentScores} matchNumber={state.matchNumber ?? 1} />
              : stage === "MATCH_PT" ? <MatchResultStage rows={currentScores} title="GAME STANDINGS" subtitle="OFFICIAL MATCH RESULT" matchNumber={state.matchNumber ?? 1} />
              : stage === "MATCH_REVIEW" ? <LiveHud rows={currentScores} matchNumber={state.matchNumber ?? 1} currentPlayer={null} teams={data.teams} tournamentName={data.tournamentName} statusLabel="MATCH COMPLETE" />
              : stage === "OVERALL" ? <OverallStage rows={overallScores} tournamentName={data.tournamentName} />
              : stage === "AUTOMATION_STARTED" ? <StartingStage introAsset={undefined} />
              : <SimpleStage stage={stage} />}
          </div>

          {stage !== "MATCH_LIVE" && stage !== "MATCH_REVIEW" && !hasCustomOutro && <footer className="ff-global-footer"><span>GAME {String(state.matchNumber ?? 1).padStart(2, "0")} / {String(data.totalMatches).padStart(2, "0")}</span><i>•</i><span>{stage.replaceAll("_", " ")}</span><i>•</i><span>OBS BROWSER SOURCE</span></footer>}
        </>
      )}
    </main>
  );
}
