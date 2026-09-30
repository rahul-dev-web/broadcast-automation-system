# SaaS access model

## Live pricing

- **Starter — ₹299 / 30 days**
  - First activation: 5 tournament creations
  - Renewal: 4 tournament creations
  - Add-on during an active month: ₹100 for 2 additional tournament credits
  - Manual scoring workflow is the currently usable product
- **Pro — ₹999 / 30 days**
  - 15 tournament creations
  - ₹150 for 2 additional tournament credits
  - Coming Soon / not activatable yet
  - Planned OCR scope: delayed OCR auto calculation at about 30 seconds latency
- **Agency — Coming Soon**
  - Realtime auto calculation
  - Player tracking
  - Advanced broadcast automation
  - Multi-operator workspace

## Access model

Supabase Auth provides customer sessions. Each user gets an isolated organization workspace and an OWNER membership. The the designated platform administrator account (`jaraho9@gmail.com`)

The connected Supabase project currently has the SaaS migration applied as 20260930050228_saas_memberships_multitenancy_v1. Existing development tournaments are retained and grandfathered as quota-exempt; they are assigned to the first platform workspace when the the designated platform administrator account (`jaraho9@gmail.com`)

Membership activation is manual at this stage. The platform admin can activate or renew Starter for 30 days and add two tournament credits at a time. No payment gateway is connected yet.

Public OBS overlays use a per-tournament broadcast token. The token is scoped to one tournament and can be rotated; the overlay URL is intended to remain private.

## Production database note

The SaaS schema was applied to the connected Supabase project during this implementation. Before moving the project to another Supabase environment, pull the remote schema into the repository migration history so the database changes are reproducible in version control.


## Platform administrator

Platform Admin is a protected platform role. It is not assigned to the first account anymore.

The public signup trigger always creates `USER` accounts. The designated Auth account is provisioned separately and then marked `PLATFORM_ADMIN`; the database helper additionally requires that exact Auth email plus the profile role. Normal authenticated users cannot update the authorization-sensitive profile columns through the Data API.

The frontend `/admin/` route is an additional UX gate, but Supabase RLS and the guarded platform subscription RPCs remain the security boundary.

## Broadcast themes

Broadcast themes are stored in `public.broadcast_themes`. System presets are read-only presets; organizations can clone a preset into a custom theme and assign it to a tournament.

The theme editor previews the same visual contract used by the production browser-source overlay. Gameplay HUD stages can remain transparent while result/roster/room stages can use a branded background. The assigned theme is resolved by the live overlay through the tournament's `theme_id`, so the saved configuration stays synchronized between the studio, Supabase and OBS/browser-source output.
