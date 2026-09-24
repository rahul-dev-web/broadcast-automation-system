import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero-card">
        <p className="eyebrow">BROADCAST AUTOMATION SYSTEM</p>
        <h1>Free Fire Tournament Control</h1>
        <p className="lead">
          Tournament setup, team rosters, scoring and broadcast automation are being built phase-by-phase.
        </p>
        <div className="hero-actions">
          <Link className="primary-button" href="/dashboard/">
            Open Operator Dashboard
          </Link>
          <Link className="ghost-button" href="/tournaments/new/">
            Create Tournament
          </Link>
        </div>
      </section>
    </main>
  );
}
