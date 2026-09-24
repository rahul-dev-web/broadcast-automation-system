"use client";

import { useMemo, useState } from "react";
import { calculateMatchPoints } from "@/lib/scoring";

type OverlayStage = "ROSTER_1" | "ROSTER_2" | "ROOM" | "MATCH" | "RESULT" | "OVERALL" | "THANK_YOU";

const teams = [
  { number: 1, name: "Nova Reapers", prefix: "NVR", player: "Rahul Kumar" },
  { number: 2, name: "Clutch Titans", prefix: "CLT", player: "Yash Verma" },
  { number: 3, name: "Night Wolves", prefix: "NWL", player: "Shubham Singh" },
  { number: 4, name: "Orbit Esports", prefix: "ORB", player: "Shreyas Patel" },
  { number: 5, name: "Velocity", prefix: "VLT", player: "Raj Jha" },
  { number: 6, name: "Fireline", prefix: "FRL", player: "Lucky" },
  { number: 7, name: "Red Ravens", prefix: "RRV", player: "Aman" },
  { number: 8, name: "Ghost Unit", prefix: "GHU", player: "Dev" },
  { number: 9, name: "Storm Nine", prefix: "STM", player: "Karan" },
  { number: 10, name: "Alpha Core", prefix: "ALP", player: "Rishi" },
  { number: 11, name: "Blaze Five", prefix: "BLZ", player: "Vikram" },
  { number: 12, name: "Skyline", prefix: "SKY", player: "Arjun" },
];

const resultRows = teams.map((team, index) => {
  const placement = index + 1;
  const kills = Math.max(1, 9 - index);
  return {
    ...team,
    placement,
    kills,
    ...calculateMatchPoints(kills, placement),
  };
});

export function OverlayPreview() {
  const [stage, setStage] = useState<OverlayStage>("ROSTER_1");

  const title = useMemo(() => {
    const labels: Record<OverlayStage, string> = {
      ROSTER_1: "Roster / Page 1",
      ROSTER_2: "Roster / Page 2",
      ROOM: "Room HUD",
      MATCH: "Match Live",
      RESULT: "Match Result",
      OVERALL: "Overall Standing",
      THANK_YOU: "Thank You",
    };
    return labels[stage];
  }, [stage]);

  return (
    <section className="overlay-workspace">
      <div className="overlay-toolbar">
        <div>
          <span className="eyebrow">MOCK STATE</span>
          <strong>{title}</strong>
        </div>
        <div className="overlay-controls">
          <button className="ghost-button small" onClick={() => setStage("ROSTER_1")}>Roster 1</button>
          <button className="ghost-button small" onClick={() => setStage("ROSTER_2")}>Roster 2</button>
          <button className="ghost-button small" onClick={() => setStage("ROOM")}>Room</button>
          <button className="ghost-button small" onClick={() => setStage("MATCH")}>Match</button>
          <button className="ghost-button small" onClick={() => setStage("RESULT")}>Result</button>
          <button className="ghost-button small" onClick={() => setStage("OVERALL")}>Overall</button>
          <button className="ghost-button small" onClick={() => setStage("THANK_YOU")}>Thank You</button>
        </div>
      </div>

      <div className="broadcast-canvas">
        {stage === "ROSTER_1" || stage === "ROSTER_2" ? (
          <RosterStage page={stage === "ROSTER_1" ? 1 : 2} />
        ) : null}

        {stage === "ROOM" ? <RoomStage /> : null}
        {stage === "MATCH" ? <MatchStage /> : null}
        {stage === "RESULT" ? <ResultStage /> : null}
        {stage === "OVERALL" ? <OverallStage /> : null}
        {stage === "THANK_YOU" ? <ThankYouStage /> : null}
      </div>
    </section>
  );
}

function RosterStage({ page }: { page: 1 | 2 }) {
  const pageTeams = teams.slice(page === 1 ? 0 : 6, page === 1 ? 6 : 12);

  return (
    <div className="broadcast-stage roster-stage">
      <div className="broadcast-kicker">TOURNAMENT ROSTER</div>
      <h2>Team Introduction</h2>
      <div className="roster-grid">
        {pageTeams.map((team) => (
          <article className="roster-card" key={team.number}>
            <div className="roster-logo">{team.prefix}</div>
            <div>
              <div className="roster-team">{team.name}</div>
              <div className="roster-prefix">{team.prefix}</div>
            </div>
            <div className="roster-players">
              <span>{team.player}</span>
              <span>Player 2</span>
              <span>Player 3</span>
              <span>Player 4</span>
              <span className="sub-player">Player 5 · SUB</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RoomStage() {
  return (
    <div className="broadcast-stage room-stage">
      <div className="room-top">
        <div>
          <span className="broadcast-kicker">ROOM</span>
          <h2>Battle Royale · Match 1</h2>
        </div>
        <div className="room-badge">LIVE</div>
      </div>

      <div className="hud-card">
        <span className="hud-slot">SLOT 01</span>
        <span className="hud-team">NOVA REAPERS · NVR</span>
        <strong>Rahul Kumar</strong>
        <span className="hud-note">Registered display name</span>
      </div>

      <div className="hud-grid">
        {[1, 2, 3, 4, 5, 6].map((slot) => (
          <div className="mini-slot" key={slot}>
            <span>{String(slot).padStart(2, "0")}</span>
            <strong>{teams[slot - 1].prefix}</strong>
            <small>{teams[slot - 1].name}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchStage() {
  const rows = resultRows.slice(0, 6);

  return (
    <div className="broadcast-stage room-stage">
      <div className="room-top">
        <div>
          <span className="broadcast-kicker">MATCH 1</span>
          <h2>Live Match State</h2>
        </div>
        <div className="room-badge">OCR / LIVE</div>
      </div>

      <div className="match-live-table">
        {rows.map((row) => (
          <div className="live-row" key={row.number}>
            <span>{String(row.number).padStart(2, "0")}</span>
            <strong>{row.prefix}</strong>
            <span>{row.name}</span>
            <b>{row.kills} K</b>
          </div>
        ))}
      </div>

      <div className="live-player-banner">
        <span>OBSERVED PLAYER</span>
        <strong>Rahul Kumar</strong>
        <small>NVR · mapped from in-game identity</small>
      </div>
    </div>
  );
}

function ResultStage() {
  return (
    <div className="broadcast-stage">
      <div className="table-heading">
        <div>
          <span className="broadcast-kicker">MATCH 1</span>
          <h2>Verified Match Result</h2>
        </div>
        <span className="room-badge">VERIFIED</span>
      </div>

      <div className="result-table">
        {resultRows.map((row) => (
          <div className="result-line" key={row.number}>
            <span className="place">{row.placement}</span>
            <strong>{row.prefix}</strong>
            <span>{row.name}</span>
            <span>{row.kills} K</span>
            <span>{row.positionPoints} POS</span>
            <b>{row.totalPoints}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverallStage() {
  const overall = [...resultRows]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((row, index) => ({ ...row, overallPlace: index + 1 }));

  return (
    <div className="broadcast-stage">
      <div className="table-heading">
        <div>
          <span className="broadcast-kicker">TOURNAMENT</span>
          <h2>Overall Standing</h2>
        </div>
        <span className="room-badge">FINAL</span>
      </div>

      <div className="result-table">
        {overall.map((row) => (
          <div className="result-line" key={row.number}>
            <span className="place">{row.overallPlace}</span>
            <strong>{row.prefix}</strong>
            <span>{row.name}</span>
            <span>M1 {row.totalPoints}</span>
            <b>{row.totalPoints}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThankYouStage() {
  return (
    <div className="broadcast-stage thank-you-stage">
      <span className="broadcast-kicker">BROADCAST COMPLETE</span>
      <h2>THANK YOU FOR WATCHING</h2>
      <p>See you in the next tournament.</p>
    </div>
  );
}
