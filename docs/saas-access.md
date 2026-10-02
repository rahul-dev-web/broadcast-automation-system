# SaaS access model

## Current pricing

- **Starter — ₹299 / 30 days**
  - 5 tournament creations per active month
  - Add-on: 2 additional tournament credits for ₹100
  - Manual scoring workflow
  - Broadcast scene workflow and OBS browser-source overlay
  - **Four System Design Packs**
  - **No Custom Design Studio**
  - No Local OCR/CV or Cloud OCR

- **Pro — ₹999 / 30 days**
  - 5 tournament creations per active month
  - 2,000 included Cloud OCR Units
  - Add-on: 2 tournament credits + 1,000 OCR Units
  - Everything in Starter
  - **Custom Design Studio**
  - Local OCR/CV
  - OCR-assisted result import
  - Cloud OCR fallback
  - Advanced data/history and automation features

- **Agency — Coming Soon**
  - Realtime automation
  - Player tracking
  - Advanced broadcast automation
  - Multi-operator workspace

## Design entitlement

The four built-in System Design Packs are available to both Starter and Pro:

1. Angular Arena
2. Championship Cinematic
3. Future Grid
4. Minimal Broadcast

Custom Design Studio is a **Pro-only** entitlement.

The Pro requirement is enforced at multiple layers:

- Design Studio UI hides/locks custom creation, cloning, editing and uploads for Starter.
- Database RLS blocks Starter users from creating, editing or deleting custom design records/assets.
- Storage policies block Starter users from uploading, updating or deleting custom design assets.
- Tournament design validation allows System designs to Starter/Pro, while Custom designs require an active Pro subscription.
- Existing custom designs are not deleted during downgrade; they remain data owned by the organization and can continue to be rendered by an already-assigned public broadcast until the normal broadcast-token rules apply. Custom management resumes when the workspace has an active Pro subscription.

## Access model

Supabase Auth provides customer sessions. Each user belongs to an isolated organization workspace with an OWNER membership. Platform administration is a separate protected role.

Membership activation is manual at this stage. The platform admin can activate or renew Starter/Pro memberships and add tournament credits. No payment gateway is connected yet.

Public OBS overlays use per-tournament broadcast tokens. Tokens are hashed in the database and expire after 30 days. Multiple active tokens may exist for one tournament, so generating a new OBS URL does not invalidate an existing Browser Source.

## Production database note

The repository contains the intended schema and migrations, but the connected production database has also received a few direct SQL hotfixes during development. The live schema must therefore be treated as authoritative when auditing production. Before moving to another Supabase environment, reconcile the remote migration history/schema so every production change is reproducible from version control.

## Security boundary

The frontend is not the authorization boundary. Supabase grants, RLS policies, protected database functions and Edge Function checks enforce tenant and plan access.

Platform subscription RPCs require the protected platform-admin helper. Custom design CRUD and asset operations require an active Pro membership plus OWNER/OPERATOR workspace access.

