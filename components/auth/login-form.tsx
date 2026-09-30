"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setBusy(false);
      return;
    }

    const next = searchParams.get("next");
    router.replace(next?.startsWith("/") ? next : "/dashboard/");
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">ARENACAST SAAS</p>
        <h1>Sign in to your workspace</h1>
        <p className="muted">Run tournaments, scoring and broadcast control from your customer workspace.</p>

        <form className="auth-form" onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input required minLength={6} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div className="error-banner">{error}</div>}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="auth-foot">New customer? <Link href="/auth/signup/">Create an account</Link></p>
        <Link className="ghost-button" href="/">← Back to platform</Link>
      </section>
    </main>
  );
}
