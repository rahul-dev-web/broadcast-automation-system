"use client";

import { useMemo } from "react";
import {
  normalizeTheme,
  themeCssVariables,
  type BroadcastStage,
  type BroadcastThemeConfig,
} from "@/lib/broadcast-theme";

const teams = [
  ["NVR", "Nova Reapers"], ["CLT", "Clutch Titans"], ["NWL", "Night Wolves"],
  ["ORB", "Orbit Esports"], ["VLT", "Velocity"], ["FRL", "Fireline"],
];

export function BroadcastThemePreview({
  theme,
  stage,
}: {
  theme: BroadcastThemeConfig;
  stage: BroadcastStage;
}) {
  const normalized = useMemo(() => normalizeTheme(theme), [theme]);
  const vars = useMemo(() => themeCssVariables(normalized, stage), [normalized, stage]);

  return (
    <div className={`broadcast-overlay ff-broadcast-root stage-${stage.toLowerCase()} theme-live-preview`} style={vars}>
      <div className="ff-bg" />
      <header className="ff-global-header">
        <div className="ff-brand">
          <span className="ff-brand-mark">{normalized.branding.mark}</span>
          <div><strong>{normalized.branding.label}</strong><small>LIVE THEME PREVIEW</small></div>
        </div>
        <div className="ff-connection"><span className="ff-live-dot" /> PREVIEW</div>
      </header>

      <div className="ff-stage-mount">
        {stage === "ROSTER_1" || stage === "ROSTER_2" ? (
          <section className="ff-stage ff-lineup-stage">
            <div className="ff-corner ff-corner-tl" /><div className="ff-corner ff-corner-tr" />
            <div className="ff-corner ff-corner-bl" /><div className="ff-corner ff-corner-br" />
            <div className="ff-title-block">
              <span>THEME PREVIEW</span>
              <h1>TEAM <em>LINEUP</em></h1>
              <i>{stage === "ROSTER_1" ? "01 / 02" : "02 / 02"}</i>
            </div>
            <div className="ff-lineup-grid">
              {teams.map(([prefix, name], index) => (
                <article className="ff-lineup-card" key={prefix} style={{ "--delay": `${index * 30}ms` } as React.CSSProperties}>
                  <div className="ff-lineup-card-head">
                    <span className="ff-team-logo ff-team-logo-fallback">{prefix.slice(0, 3)}</span>
                    <div><strong>{name}</strong><span>{prefix}</span></div><b>#{String(index + 1).padStart(2, "0")}</b>
                  </div>
                  <div className="ff-player-strip">
                    {["PLAYER 01", "PLAYER 02", "PLAYER 03", "PLAYER 04"].map((p) => <div className="ff-player-chip" key={p}><span>•</span><strong>{p}</strong></div>)}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : stage === "ROOM" ? (
          <section className="ff-stage ff-room-stage">
            <div className="ff-room-orbit" />
            <div className="ff-room-copy">
              <span className="ff-overline">MATCH 01 · THEME PREVIEW</span>
              <h1>GET<br /><em>READY</em></h1>
              <p>12 TEAMS REGISTERED · BROADCAST PACKAGE PREVIEW</p>
              <div className="ff-ready-pill"><span /> MATCH READY</div>
            </div>
            <div className="ff-room-grid">
              {teams.map(([prefix, name], index) => <div className="ff-room-team" key={prefix} style={{ "--delay": `${index * 35}ms` } as React.CSSProperties}><b>{String(index + 1).padStart(2, "0")}</b><strong>{prefix}</strong><span>{name}</span></div>)}
            </div>
            <div className="ff-action-bar"><span>GAMEPLAY REMAINS VISIBLE WHERE THIS STAGE IS TRANSPARENT</span><strong>POINT RUSH</strong></div>
          </section>
        ) : stage === "MATCH_LIVE" || stage === "MATCH_REVIEW" ? (
          <section className="ff-stage ff-live-stage">
            <div className="ff-live-top">
              <div className="ff-live-match"><span className="ff-live-dot" /> MATCH 01</div>
              <div className="ff-live-center">THEME PREVIEW</div>
              <div className="ff-live-feed">{stage === "MATCH_REVIEW" ? "MATCH COMPLETE" : "LIVE"} <span /></div>
            </div>
            <aside className="ff-standings">
              <div className="ff-standings-title"><strong>GAME STANDINGS</strong><span>KILLS</span></div>
              {teams.map(([prefix], index) => <div className="ff-standing-row" key={prefix}><b>{index + 1}</b><strong>{prefix}</strong><em>{9 - Math.min(index, 8)} K</em></div>)}
            </aside>
            <div className="ff-player-focus"><div className="ff-focus-accent" /><div className="ff-focus-team">NVR <span>PLAYER FOCUS</span></div><strong>PLAYER ONE</strong><div className="ff-focus-meta"><span>TEAM 01</span><span>·</span><span>LIVE</span></div></div>
            <div className="ff-live-score-strip">{teams.map(([prefix], index) => <div className="ff-live-score" key={prefix}><b>{index + 1}</b><strong>{prefix}</strong><span>{9 - Math.min(index, 8)} KILLS</span></div>)}</div>
            <div className="ff-live-brand-watermark">BA <small>THEME PREVIEW</small></div>
          </section>
        ) : stage === "MATCH_VERIFIED" ? (
          <section className="ff-stage ff-booyah-stage">
            <div className="ff-booyah-flare" /><div className="ff-booyah-word">BOOYAH!</div>
            <div className="ff-booyah-sub">MATCH 01 · OFFICIAL RESULT</div>
            <div className="ff-winner-card"><div className="ff-winner-rank">#01</div><div><span>WINNER</span><strong>NVR</strong><small>NOVA REAPERS</small></div><div className="ff-winner-stats"><b>42<small>PTS</small></b><b>9<small>ELIMS</small></b></div></div>
            <div className="ff-result-note">POINT RUSH · GRAND FINALS</div>
          </section>
        ) : stage === "MATCH_PT" ? (
          <section className="ff-stage ff-results-stage">
            <div className="ff-results-heading"><div><span>OFFICIAL MATCH RESULT</span><h1>GAME <em>STANDINGS</em></h1></div><b>GAME 01</b></div>
            <div className="ff-results-table">
              <div className="ff-results-head"><span>#</span><span>TEAM</span><span>PLACE</span><span>ELIMS</span><span>PTS</span></div>
              {teams.map(([prefix], index) => <div className="ff-results-row" key={prefix}><b>{String(index + 1).padStart(2, "0")}</b><strong>{prefix}</strong><span>{index + 1}</span><span>{9 - Math.min(index, 8)}</span><em>{42 - index * 3}</em></div>)}
            </div>
          </section>
        ) : stage === "OVERALL" ? (
          <section className="ff-stage ff-overall-stage">
            <div className="ff-overall-title"><span>THEME PREVIEW</span><h1>GAME <em>STANDINGS</em></h1><b>OVERALL</b></div>
            <div className="ff-overall-table">{teams.map(([prefix, name], index) => <div className={`ff-overall-row ${index < 3 ? "podium-row" : ""}`} key={prefix}><b>{String(index + 1).padStart(2, "0")}</b><strong>{prefix}</strong><span>{name}</span><i>{9 - Math.min(index, 8)} ELIMS</i><em>{42 - index * 3}</em></div>)}</div>
          </section>
        ) : (
          <section className="ff-stage ff-simple-stage"><span>THANK YOU FOR WATCHING</span><h1>FORGE YOUR LEGACY</h1><p>Tournament presentation complete.</p></section>
        )}
      </div>
      <footer className="ff-global-footer"><span>THEME ENGINE</span><i>•</i><span>{stage.replaceAll("_", " ")}</span><i>•</i><span>LIVE PREVIEW</span></footer>
    </div>
  );
}
