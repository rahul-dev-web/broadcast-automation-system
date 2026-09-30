import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/dashboard/";
  if (!next.startsWith("/")) next = "/dashboard/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const target = forwardedHost ? `https://${forwardedHost}${next}` : `${origin}${next}`;
      return NextResponse.redirect(target);
    }
  }

  return NextResponse.redirect(new URL("/auth/auth-code-error/", request.url));
}
