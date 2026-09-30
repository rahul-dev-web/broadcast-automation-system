import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">AUTHENTICATION</p>
        <h1>Authentication link expired</h1>
        <p className="muted">The authentication code could not be exchanged. Start the sign-in flow again.</p>
        <Link className="primary-button" href="/auth/login/">Back to sign in</Link>
      </section>
    </main>
  );
}
