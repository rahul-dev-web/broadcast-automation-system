import Link from "next/link";

const pipeline = [
  "Tournament setup",
  "Team & player management",
  "Roster broadcast",
  "Room HUD",
  "Manual scoring",
  "OCR result review",
  "Points table",
  "Overall standings",
  "Thank-you screen",
];

export default function DashboardPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">OPERATOR</p>
          <h1>Broadcast Control</h1>
        </div>
        <Link className="primary-button" href="/tournaments/new/">
          + New Tournament
        </Link>
      </header>

      <section className="grid-2">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">PHASE 1–4</p>
              <h2>Current build</h2>
            </div>
            <span className="status-pill">FOUNDATION</span>
          </div>
          <p className="muted">
            The repository is initialized with the tournament configuration foundation.
          </p>
          <div className="stat-row">
            <div>
              <span className="stat-value">12</span>
              <span className="stat-label">Team slots</span>
            </div>
            <div>
              <span className="stat-value">5</span>
              <span className="stat-label">Players / team</span>
            </div>
            <div>
              <span className="stat-value">3</span>
              <span className="stat-label">PT modes</span>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">AUTOMATION</p>
              <h2>Lifecycle</h2>
            </div>
          </div>
          <div className="pipeline">
            {pipeline.map((step, index) => (
              <div className="pipeline-item" key={step}>
                <span className="pipeline-index">{String(index + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">NEXT</p>
            <h2>Tournament creation</h2>
          </div>
          <Link className="ghost-button" href="/tournaments/new/">
            Open setup
          </Link>
        </div>
        <p className="muted">
          Configure tournament matches, choose the PT presentation mode and prepare up to twelve team slots.
        </p>
      </section>
    </main>
  );
}
