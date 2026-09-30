-- Tighten profile Data API exposure for anonymous clients.
revoke all on table public.profiles from anon;
