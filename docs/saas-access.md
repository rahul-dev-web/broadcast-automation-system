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

Supabase Auth provides customer sessions. Each user gets an isolated organization workspace and an OWNER membership. The first account created becomes the platform admin so the platform can be operated without a separate bootstrap account.

The connected Supabase project currently has the SaaS migration applied as 20260930050228_saas_memberships_multitenancy_v1. Existing development tournaments are retained and grandfathered as quota-exempt; they are assigned to the first platform workspace when the first user signs up.

Membership activation is manual at this stage. The platform admin can activate or renew Starter for 30 days and add two tournament credits at a time. No payment gateway is connected yet.

Public OBS overlays use a per-tournament broadcast token. The token is scoped to one tournament and can be rotated; the overlay URL is intended to remain private.

## Production database note

The SaaS schema was applied to the connected Supabase project during this implementation. Before moving the project to another Supabase environment, pull the remote schema into the repository migration history so the database changes are reproducible in version control.
