import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_placeholder";

function browserOptions(headers?: Record<string, string>) {
  return {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: headers ? { headers } : undefined,
  };
}

export const supabase = createBrowserClient(url, publishableKey, browserOptions());

export function createBroadcastClient(token: string) {
  return createBrowserClient(
    url,
    publishableKey,
    browserOptions(token ? { "x-broadcast-token": token } : undefined),
  );
}

export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
