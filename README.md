# Free Fire Tournament Broadcast Automation System

ArenaCast is a Free Fire tournament scoring and broadcast automation platform built around Next.js, Supabase, Cloudflare Pages, OBS browser-source output, Cloud OCR and a Pro-only Local Agent.

## Product rules
- Maximum 12 teams per tournament.
- Each team has 5 player slots: Player 1-4 main roster, Player 5 optional substitute.
- Registered/display name and in-game name remain separate.
- Manual scoring is scoring/result input only; it does not auto-switch observers or players.
- OCR events/results are proposed first and require operator review/verification before becoming official.
- Manual and OCR inputs use the same scoring engine.
- Kill = 1 point.
- Placement points: 1st 12, 2nd 9, 3rd 8, 4th 7, 5th 6, 6th 5, 7th 4, 8th 3, 9th 2, 10th 1, 11th 0, 12th 0.
- Broadcast lifecycle: Setup -> Roster -> Room -> Match -> Review -> Verified/PT -> Overall -> Thank You.

## Current subscription model

### Starter — ₹299 / 30 days
- 5 tournament creations per active month
- Manual scoring
- Review / Verify / Publish
- Broadcast workflow + OBS browser source
- Four System Design Packs
- Custom Design Studio + asset uploads
- OCR / Local Agent: unavailable

### Pro
Coming Soon.
- No activation or payment is available while Pro is disabled.
- The implemented OCR / automation code remains in the repository for a future release.

### Agency
Coming Soon.

## Broadcast Design Studio
The four System Design Packs are available to Starter and Pro:
1. Angular Arena
2. Championship Cinematic
3. Future Grid
4. Minimal Broadcast

Custom Design Studio is temporarily included with Starter. The entitlement is enforced both in the UI and in Supabase RLS/storage policies.
Custom intro/outro media is treated as a stage replacement, not a background layer. Video intro/outro assets loop continuously in the browser/OBS renderer.

## Architecture
- Next.js App Router static export
- Supabase Auth/Postgres/RLS/Realtime/Storage/Edge Functions
- Cloudflare Pages
- Google Vision for future cloud OCR
- Windows Local Agent for future OCR/CV
- OBS browser-source broadcast overlay
- No Render dependency

## Security model
- Publishable Supabase keys are used in browser code.
- Secret/service credentials remain server-side in Edge Functions.
- Platform subscription RPCs require the protected platform-admin check.
- Custom Design CRUD/upload/assignment requires an active Starter subscription and OWNER/OPERATOR access.
- System designs are read-only and available to Starter/Pro.
- Broadcast tokens are hashed, expire after 30 days, and multiple active tokens can coexist.

## Development
npm install
npm run dev
npm run build

Production database changes live under supabase/migrations/. The connected production project has also received a small number of direct SQL hotfixes during development, so remote schema/migration history should be reconciled before cloning the project to a new Supabase environment.
