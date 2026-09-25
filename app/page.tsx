import Link from "next/link";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <main className={styles.home}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>✦</span>
          <span>ARENA<span style={{ color: "#a99aff" }}>CAST</span><small>ESPORTS BROADCAST CONTROL</small></span>
        </Link>
        <div className={styles.navLinks}>
          <a href="#platform">Platform</a>
          <a href="#workflow">How it works</a>
          <a href="#features">Features</a>
          <Link className={styles.navCta} href="/dashboard/">Operator Dashboard ↗</Link>
        </div>
      </nav>

      <section className={styles.hero} id="platform">
        <div className={styles.copy}>
          <div className={styles.pill}><span className={styles.pulse} /> TOURNAMENT OPERATIONS, REIMAGINED</div>
          <h1 className={styles.title}>Run the lobby.<br />Own the <span>broadcast.</span></h1>
          <p className={styles.description}>
            The tournament control workspace for Free Fire esports. Organize rosters, manage match scoring,
            verify results and move your broadcast through every stage—from team introductions to final standings.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/tournaments/new/">Create a Tournament <span>→</span></Link>
            <Link className={styles.secondary} href="/dashboard/">Enter Operator Dashboard ↗</Link>
          </div>
          <p className={styles.micro}>ROSTER MANAGEMENT&nbsp; / &nbsp;MATCH CONTROL&nbsp; / &nbsp;RESULT VERIFICATION&nbsp; / &nbsp;BROWSER OVERLAYS</p>
        </div>

        <div className={styles.visual} aria-label="Illustrative broadcast scoring dashboard preview">
          <div className={styles.glow} />
          <div className={styles.screen}>
            <div className={styles.screenTop}><span>AC / MATCH CENTER</span><span className={styles.live}><span className={styles.pulse} /> UI CONCEPT</span></div>
            <div className={styles.preview}>
              <div className={styles.matchTag}><span>CHAMPIONSHIP SERIES</span><span>ROUND 01 · BERMUDA</span></div>
              <div className={styles.matchTitle}>MATCH LEADERBOARD</div>
              <div className={styles.matchSub}>SAMPLE GRAPHIC · ILLUSTRATIVE DATA</div>
              <div className={styles.scoreboard}>
                <div className={styles.scoreRow}><strong>01&nbsp; NOVA ESPORTS</strong><span>12 KILLS</span><em>24 PTS</em></div>
                <div className={styles.scoreRow}><strong>02&nbsp; TEAM PHANTOM</strong><span>08 KILLS</span><em>17 PTS</em></div>
                <div className={styles.scoreRow}><strong>03&nbsp; RISING FALCONS</strong><span>06 KILLS</span><em>14 PTS</em></div>
                <div className={styles.scoreRow}><strong>04&nbsp; ELITE FORCE</strong><span>05 KILLS</span><em>11 PTS</em></div>
              </div>
            </div>
            <div className={styles.screenFoot}><span>SCORING & RESULTS</span><span>ROSTER · MATCH · OVERALL</span></div>
          </div>
          <div className={styles.floatTag}><span className={styles.floatIcon}>✓</span><span><strong>Operator-led control</strong><small>Review before results go live</small></span></div>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Platform capabilities">
        <div className={styles.metric}><strong className={styles.metricValue}>12</strong><span className={styles.metricLabel}>Team slots<br />per tournament</span></div>
        <div className={styles.metric}><strong className={styles.metricValue}>5</strong><span className={styles.metricLabel}>Roster slots<br />per team</span></div>
        <div className={styles.metric}><strong className={styles.metricValue}>1:1</strong><span className={styles.metricLabel}>Kill-to-point<br />scoring rule</span></div>
        <div className={styles.metric}><strong className={styles.metricValue}>OBS</strong><span className={styles.metricLabel}>Browser-source<br />overlay workflow</span></div>
      </section>

      <section className={styles.section} id="features">
        <div className={styles.sectionHead}>
          <div><p className={styles.sectionKicker}>THE CONTROL ROOM</p><h2 className={styles.sectionTitle}>Everything your tournament crew needs.</h2></div>
          <p className={styles.sectionDesc}>Purpose-built tools to keep tournament operations organized and broadcast presentation consistent.</p>
        </div>
        <div className={styles.cards}>
          <article className={styles.feature}><div className={styles.featureIcon}>▦</div><h3>Tournament & roster setup</h3><p>Create events, configure match counts and manage team identities, player names and substitute slots in one place.</p></article>
          <article className={styles.feature}><div className={styles.featureIcon}>⌁</div><h3>Scoring with verification</h3><p>Record kills and eliminations, calculate placement points and review results before they become official.</p></article>
          <article className={styles.feature}><div className={styles.featureIcon}>◉</div><h3>Broadcast scene workflow</h3><p>Move through roster reveals, room scenes, match presentation, points tables and overall standings.</p></article>
        </div>
      </section>

      <section className={styles.section} id="workflow">
        <div className={styles.sectionHead}>
          <div><p className={styles.sectionKicker}>FROM SETUP TO SHOWTIME</p><h2 className={styles.sectionTitle}>A clear workflow. One operator console.</h2></div>
          <p className={styles.sectionDesc}>Keep the show moving with a structured sequence and operator-controlled result checks.</p>
        </div>
        <div className={styles.workflow}>
          <article className={styles.step}><span className={styles.stepNo}>STEP 01 / SETUP</span><h3>Build your tournament</h3><p>Add teams, roster details and match configuration.</p></article>
          <article className={styles.step}><span className={styles.stepNo}>STEP 02 / PRESENT</span><h3>Bring up the broadcast</h3><p>Show roster pages and move into the room scene.</p></article>
          <article className={styles.step}><span className={styles.stepNo}>STEP 03 / OPERATE</span><h3>Run and score the match</h3><p>Track kills, record eliminations and calculate placements.</p></article>
          <article className={styles.step}><span className={styles.stepNo}>STEP 04 / VERIFY</span><h3>Review and publish</h3><p>Confirm the result, then advance to points and standings.</p></article>
        </div>
      </section>

      <section className={styles.cta}>
        <div><p className={styles.sectionKicker}>READY WHEN YOUR LOBBY IS</p><h2>Take control of your next tournament.</h2><p>Start with tournament setup or jump back into your operator workspace.</p></div>
        <Link className={styles.primary} href="/tournaments/new/">Create Tournament&nbsp; →</Link>
      </section>

      <footer className={styles.bottom}><span>© 2026 ARENACAST · ESPORTS BROADCAST CONTROL</span><span>OPERATOR-LED · BUILT FOR COMPETITIVE TOURNAMENTS</span></footer>
    </main>
  );
}
