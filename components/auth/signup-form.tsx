"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setBusy(false);
      return;
    }

    if (data.session) {
      router.replace("/dashboard/");
      router.refresh();
      return;
    }

    setMessage("Account created. If email confirmation is enabled in Supabase Auth, confirm your email before signing in.");
    setBusy(false);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">START YOUR WORKSPACE</p>
        <h1>Create your account</h1>
        <p className="muted">Membership activation is handled manually for now. Your first Starter activation is ₹299 for 30 days and includes 5 tournaments.</p>

        <form className="auth-form" onSubmit={submit}>
          <label className="field">
            <span>Name / Organization contact</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </label>
          <label className="field">
            <span>Email</span>
            <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input required minLength={6} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div className="error-banner">{error}</div>}
          {message && <div className="success-banner">{message}</div>}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-foot">Already have an account? <Link href="/auth/login/">Sign in</Link></p>
        <Link className="ghost-button" href="/">← Back to platform</Link>
      </section>
    </main>
  );
}
