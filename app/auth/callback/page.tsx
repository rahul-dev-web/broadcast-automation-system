"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router=useRouter(); const [error,setError]=useState("");
  useEffect(()=>{void (async()=>{const code=new URLSearchParams(window.location.search).get("code");if(!code){router.replace("/auth/login/");return;}const {error:e}=await supabase.auth.exchangeCodeForSession(code);if(e){setError(e.message);return;}router.replace("/dashboard/");router.refresh();})();},[router]);
  return <main className="auth-shell"><section className="auth-card"><p className="eyebrow">AUTHENTICATION</p><h1>{error?"Authentication failed":"Signing you in…"}</h1><p className="muted">{error||"Please wait while your workspace session is prepared."}</p></section></main>;
}
