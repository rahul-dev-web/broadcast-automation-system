"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const type = params.get("type");
      const next = params.get("next");
      const destination =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/dashboard/";

      if (tokenHash && type === "email") {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: "email",
          token_hash: tokenHash,
        });

        if (verifyError) {
          setError(verifyError.message);
          return;
        }

        router.replace(destination);
        router.refresh();
        return;
      }

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }

        router.replace(destination);
        router.refresh();
        return;
      }

      router.replace("/auth/login/");
    })();
  }, [router]);

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">AUTHENTICATION</p>
        <h1>{error ? "Authentication failed" : "Signing you in…"}</h1>
        <p className="muted">
          {error ||
            "Please wait while your workspace session is prepared."}
        </p>
      </section>
    </main>
  );
}
