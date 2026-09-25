import Link from "next/link";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <main className={styles.home}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>✦</span>
          <span>ARENA<span style={{ color: "#a99aff" }}>CAST</span><small>BROADCAST AUTOMATION</small></span>
        </Link>
        <div className={styles.navLinks}>
          <a href="#platform">Platform</a>
          <a href="#features">Features</a>
          <Link className={styles.navCta} href="/dashboard/">Open Dashboard ↗</Link>
        </div>
      </nav>

      <section className={styles.hero} id="platform">
        <div className={styles.copy}>
          <div className={styles.pill}><span className={styles.pulse} /> BUILT FOR COMPETITIVE ESPORTS</div>
          <h1 className={styles.title}>Your tournament.<br /><span>Broadcast-ready.</span></h1>
          <p className={styles.description}>
            A unified control room for Free Fire tournaments. Manage team rosters, track match scores,
            verify results and drive broadcast graphics from one operator workspace.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/tournaments/new/">＋ Create a Tournament <span>→</span></Link>
            <Link className={styles.secondary} href="/dashboard/">Open Operator Dashboard ↗</Link>
          </div>
          <p className={styles.micro}>12-TEAM SUPPORT&nbsp; · &nbsp;MANUAL SCORING&nbsp; · &nbsp;LIVE OVERLAY WORKFLOW</p>
        </div>

        <div className={styles.visual} aria-label="Broadcast scoring interface preview">
          <div className={styles.glow} />
          <div className={styles.screen}>
            <div className={styles.screenTop}><span>ARENA CAST / MATCH CONTROL</span><span className={styles.live}><span className={styles.pulse} /> SYSTEM PREVIEW</span></div>
            <div className={styles.preview}>
              <div className={styles.matchTag}><span>TOURNAMENT SERIES</span><span>MAP 01 / BERMUDA</span></div>
              <div className={styles.matchTitle}>MATCH DAY</div>
              <div className={styles.matchSub}>LIVE SCOREBOARD PREVIEW · TOP TEAMS</div>
              <div className={styles.scoreboard}>
                <div className={styles.scoreRow}><strong>01&nbsp; NOVA ESPORTS</strong><span>12 KILLS</span><em>24 PTS</em></div>
                <div className={styles.scoreRow}><strong>02&nbsp; TEAM PHANTOM</strong><span>08 KILLS</span><em>17 PTS</em></div>
                <div className={styles.scoreRow}><strong>03&nbsp; RISING FALCONS</strong><span>06 KILLS</span><em>14 PTS</em></div>
                <div className={styles.scoreRow}><strong>04&nbsp; ELITE FORCE</strong><span>05 KILLS</span><em>11 PTS</em></div>
              </div>
            </div>
            <div className={styles.screenFoot}><span>SCORING ENGINE</span><span>ROSTER · MATCH · OVERALL</span></div>
          </div>
        </div>
      </section>

      <section className={styles.cards} id="features" aria-label="Platform features">
        <article className={styles.feature}><div className={styles.featureIcon}>▦</div><h3>Tournament workspace</h3><p>Set up events, configure match days and organize teams with up to five roster slots per team.</p></article>
        <article className={styles.feature}><div className={styles.featureIcon}>⌁</div><h3>Scoring with review</h3><p>Record kills and placements, calculate points consistently and verify match results before publishing.</p></article>
        <article className={styles.feature}><div className={styles.featureIcon}>◉</div><h3>Broadcast-ready overlays</h3><p>Move through roster, room, match and standings scenes designed for browser-source workflows.</p></article>
      </section>

      <footer className={styles.bottom}><span>© 2026 ARENACAST · ESPORTS BROADCAST CONTROL</span><span>BUILT FOR TOURNAMENT OPERATORS</span></footer>
    </main>
  );
}
