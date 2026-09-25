"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PresentationMode, TeamDraft, TournamentDraft } from "@/lib/types/tournament";
import { createTournament } from "@/lib/tournament-repository";

const MAX_TEAMS = 12;
const PLAYER_SLOTS = 5;

function createEmptyTeam(teamNumber: number): TeamDraft {
  return {
    teamNumber,
    teamName: "",
    teamPrefix: "",
    logoUrl: "",
    players: Array.from({ length: PLAYER_SLOTS }, (_, index) => ({
      slotNumber: index + 1,
      displayName: "",
      inGameName: "",
      isSubstitute: index === 4,
    })),
  };
}

export function TournamentBuilder() {
  const router = useRouter();
  const submitLock = useRef(false);
  const [name, setName] = useState("");
  const [totalMatches, setTotalMatches] = useState(6);
  const [presentationMode, setPresentationMode] = useState<PresentationMode>("PER_MATCH");
  const [customMatches, setCustomMatches] = useState<number[]>([]);
  const [teams, setTeams] = useState<TeamDraft[]>(
    Array.from({ length: MAX_TEAMS }, (_, index) => createEmptyTeam(index + 1)),
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdTournamentId, setCreatedTournamentId] = useState<string | null>(null);

  const modeDescription = useMemo(() => {
    if (presentationMode === "PER_MATCH") {
      return "Show each verified match points table, then show overall standings at the end.";
    }
    if (presentationMode === "OVERALL_ONLY") {
      return "Store every match result internally and show only overall standings publicly.";
    }
    return "Select exactly which completed match numbers should trigger a public points-table display.";
  }, [presentationMode]);

  function updateTeam(teamNumber: number, patch: Partial<TeamDraft>) {
    setTeams((current) =>
      current.map((team) => (team.teamNumber === teamNumber ? { ...team, ...patch } : team)),
    );
  }

  function updatePlayer(
    teamNumber: number,
    slotNumber: number,
    patch: Partial<TeamDraft["players"][number]>,
  ) {
    setTeams((current) =>
      current.map((team) =>
        team.teamNumber !== teamNumber
          ? team
          : {
              ...team,
              players: team.players.map((player) =>
                player.slotNumber === slotNumber ? { ...player, ...patch } : player,
              ),
            },
      ),
    );
  }

  function toggleCustomMatch(matchNumber: number) {
    setCustomMatches((current) =>
      current.includes(matchNumber)
        ? current.filter((item) => item !== matchNumber)
        : [...current, matchNumber].sort((a, b) => a - b),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    setError("");
    setSaved(false);
    setCreatedTournamentId(null);

    if (presentationMode === "CUSTOM" && customMatches.length === 0) {
      setError("Select at least one match for Custom PT mode.");
      return;
    }

    submitLock.current = true;
    setSaving(true);
    try {
      const draft: TournamentDraft = {
        name,
        totalMatches,
        presentationMode,
        customMatches,
        teams,
      };
      const tournamentId = await createTournament(draft);
      setCreatedTournamentId(tournamentId);
      setSaved(true);
      router.push(`/broadcast/control?tournament=${encodeURIComponent(tournamentId)}`);
    } catch (submissionError) {
      submitLock.current = false;
      setError(submissionError instanceof Error ? submissionError.message : "Could not save tournament.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="builder" onSubmit={handleSubmit}>
      <header className="topbar">
        <div>
          <p className="eyebrow">TOURNAMENT CREATION</p>
          <h1>Build a tournament</h1>
          <p className="muted">
            Configure the event before the live automation session starts.
          </p>
        </div>
        <button className="primary-button" type="submit" disabled={saving} aria-busy={saving}>
          {saving ? "Saving Tournament…" : "Confirm & Save"}
        </button>
      </header>

      {saved && createdTournamentId && (
        <div className="success-banner" role="status">
          Tournament created successfully. Opening its broadcast control…
        </div>
      )}
      {error && <div className="error-banner">{error}</div>}

      <section className="panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">01</p>
            <h2>Tournament settings</h2>
          </div>
          <span className="status-pill">MAX 12 TEAMS</span>
        </div>

        <div className="form-grid three">
          <label className="field">
            <span>Tournament name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Raipur Free Fire Cup"
            />
          </label>

          <label className="field">
            <span>Total matches</span>
            <input
              required
              min={1}
              max={50}
              type="number"
              value={totalMatches}
              onChange={(event) => {
                const next = Math.max(1, Math.min(50, Number(event.target.value)));
                setTotalMatches(next);
                setCustomMatches((current) => current.filter((match) => match <= next));
              }}
            />
          </label>

          <div className="field">
            <span>Default match input</span>
            <div className="readonly-control">Manual / OCR capability is entitlement-controlled</div>
          </div>
        </div>

        <div className="field-group">
          <div className="field-heading">
            <span>Points-table presentation</span>
            <span className="muted">Overall standings are always shown at the end.</span>
          </div>

          <div className="mode-grid">
            {([
              ["PER_MATCH", "Per Match", "Show each completed match PT."],
              ["OVERALL_ONLY", "Overall Only", "Hide individual match PT publicly."],
              ["CUSTOM", "Custom Match", "Choose the completed matches that trigger PT."],
            ] as const).map(([value, label, description]) => (
              <button
                className={presentationMode === value ? "mode-card active" : "mode-card"}
                key={value}
                type="button"
                onClick={() => setPresentationMode(value)}
              >
                <strong>{label}</strong>
                <span>{description}</span>
              </button>
            ))}
          </div>

          <p className="mode-description">{modeDescription}</p>

          {presentationMode === "CUSTOM" && (
            <div className="custom-matches">
              <div className="field-heading">
                <span>Select PT match numbers</span>
                <span className="muted">{customMatches.length} selected</span>
              </div>
              <div className="match-selector">
                {Array.from({ length: totalMatches }, (_, index) => index + 1).map((match) => (
                  <button
                    className={customMatches.includes(match) ? "match-chip active" : "match-chip"}
                    type="button"
                    key={match}
                    onClick={() => toggleCustomMatch(match)}
                  >
                    M{match}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">02</p>
            <h2>Team roster setup</h2>
          </div>
          <span className="muted">12 fixed team slots</span>
        </div>

        <div className="team-grid">
          {teams.map((team) => (
            <article className="team-card" key={team.teamNumber}>
              <div className="team-card-header">
                <div>
                  <span className="slot-label">TEAM {String(team.teamNumber).padStart(2, "0")}</span>
                  <h3>{team.teamName || "Team " + team.teamNumber}</h3>
                </div>
                <span className="team-status">
                  {team.players.filter((player) => player.displayName.trim()).length}/5
                </span>
              </div>

              <div className="form-grid two compact">
                <label className="field">
                  <span>Team name</span>
                  <input
                    value={team.teamName}
                    onChange={(event) => updateTeam(team.teamNumber, { teamName: event.target.value })}
                    placeholder="Team name"
                  />
                </label>
                <label className="field">
                  <span>Prefix</span>
                  <input
                    value={team.teamPrefix}
                    onChange={(event) => updateTeam(team.teamNumber, { teamPrefix: event.target.value.toUpperCase() })}
                    placeholder="TAG"
                    maxLength={8}
                  />
                </label>
              </div>

              <label className="field">
                <span>Logo URL <em>optional</em></span>
                <input
                  value={team.logoUrl}
                  onChange={(event) => updateTeam(team.teamNumber, { logoUrl: event.target.value })}
                  placeholder="https://..."
                />
              </label>

              <div className="players">
                <div className="field-heading">
                  <span>Players</span>
                  <span className="muted">P1–P4 main • P5 substitute</span>
                </div>

                {team.players.map((player) => (
                  <div className="player-row" key={player.slotNumber}>
                    <span className="player-slot">P{player.slotNumber}</span>
                    <div className="player-fields">
                      <input
                        aria-label={"Team " + team.teamNumber + " player " + player.slotNumber + " display name"}
                        value={player.displayName}
                        onChange={(event) =>
                          updatePlayer(team.teamNumber, player.slotNumber, {
                            displayName: event.target.value,
                          })
                        }
                        placeholder="Registered / display name"
                      />
                      <input
                        aria-label={"Team " + team.teamNumber + " player " + player.slotNumber + " in-game name"}
                        value={player.inGameName}
                        onChange={(event) =>
                          updatePlayer(team.teamNumber, player.slotNumber, {
                            inGameName: event.target.value,
                          })
                        }
                        placeholder="In-game name"
                      />
                    </div>
                    {player.isSubstitute && <span className="sub-badge">SUB</span>}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel scoring-panel">
        <div>
          <p className="eyebrow">03</p>
          <h2>Locked scoring rules</h2>
          <p className="muted">The same scoring engine will be used by Manual and OCR inputs.</p>
        </div>
        <div className="score-rules">
          <div><strong>1</strong><span>point per kill</span></div>
          <div><strong>12</strong><span>1st place</span></div>
          <div><strong>9</strong><span>2nd place</span></div>
          <div><strong>8</strong><span>3rd place</span></div>
          <div><strong>7→1</strong><span>4th→10th</span></div>
          <div><strong>0</strong><span>11th & 12th</span></div>
        </div>
      </section>
    </form>
  );
}
