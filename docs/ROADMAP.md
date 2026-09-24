# Broadcast Automation System — Build Roadmap

## Locked product baseline

- Maximum 12 teams.
- Exactly 5 player slots per team.
- Player 1–4 are main roster; Player 5 is an optional substitute.
- Registered/display player name and in-game name are separate fields.
- Manual mode is scoring/result input only.
- Manual mode has no observer/player switching.
- OCR mode contains two distinct capabilities:
  1. final match-standing OCR for result extraction
  2. live observer/player OCR for player identity switching
- OCR output is always proposed data until operator verification.
- Manual and OCR both use one scoring engine.
- Overall standings are mandatory after the last match.
- PT presentation has exactly three modes: Per Match, Overall Only, Custom Match Selection.
- Start Automation begins the broadcast lifecycle.
- Team roster intro is two pages of six teams, with operator-controlled Next and Close.
- Thank You screen remains on the overlay after overall standings until the stream is stopped externally.

## Phase 0 — Technical validation

- Validate final-standing screenshot OCR.
- Validate 12-row/team + kill + placement parsing.
- Validate crop/pre-processing approach.
- Identify and validate the real observer-frame input source for live player OCR.
- Validate in-game-name -> registered-name mapping.
- Validate Supabase Realtime state delivery.
- Validate OBS Browser Source loading and refresh behavior.

Exit condition: the four core proofs work independently before deeper product development.

## Phase 1 — App foundation

- Next.js + TypeScript
- Static-export-compatible deployment target
- Shared types and constants
- Environment contract
- UI shell and responsive design

## Phase 2 — Database

- tournaments
- teams
- players
- matches
- match_team_state
- scoring_events
- ocr_results
- match_results
- broadcast_sessions
- RLS/auth model

## Phase 3 — Tournament creation

- Tournament name
- Total match count
- PT mode
- Custom match selection
- Confirm & Save

## Phase 4 — Team/player management

- 12 fixed team slots
- Team name/prefix/logo
- Five player slots
- Substitute handling
- Registered/in-game name mapping

## Phase 5 — Broadcast design system

- Intro transitions
- Team cards
- Player cards
- Room HUD
- Match result tables
- Overall standings
- Thank You animation

## Phase 6 — Roster intro

- Intro animation
- Page 1: teams 1–6
- Operator Next
- Page 2: teams 7–12
- Operator Close

## Phase 7 — Room HUD

- Team slot identity
- Team name/prefix
- Current player registered name
- Broadcast-safe layout

## Phase 8 — Manual scoring engine

- Match start/end
- Team kill +/- controls
- Elimination action
- Placement derivation
- Match result calculation
- Audit events

## Phase 9 — Final-standing OCR

- Capture/upload
- Vision OCR
- Structured extraction
- Team mapping
- Proposed result

## Phase 10 — Review/verification

- Review screen
- Editable OCR values
- Validation
- Verify/Reject
- Official result commit

## Phase 11 — Match lifecycle

- Match state machine
- Review gate
- PT trigger
- Next-match transition
- Final-match transition

## Phase 12 — PT presentation

- Per Match
- Overall Only
- Custom Match Selection
- Mandatory Overall at tournament end

## Phase 13 — Overall standings

- Cumulative scoring
- Match-by-match columns
- Final totals
- Deterministic tie-handling rule to be defined before production

## Phase 14 — Realtime

- Operator -> state publisher
- Broadcast overlay subscription
- Reconnect behavior
- State snapshot + event synchronization

## Phase 15 — Live player OCR

- Frame source integration
- HUD crop
- In-game name detection
- Player mapping
- Realtime identity update
- OCR-only capability gate

## Phase 16 — Automation controller

SETUP -> ROSTER -> ROOM -> MATCH_LIVE -> MATCH_REVIEW -> MATCH_VERIFIED -> PT/NEXT -> OVERALL -> THANK_YOU -> CLOSED

## Phase 17 — Admin entitlement

- Subscription record
- Feature entitlements
- OCR disabled by default
- OCR access controlled by subscription

## Phase 18 — Production hardening

- RLS/security
- Error handling
- Recovery/reconnect
- Logging/audit
- Browser/OBS resilience

## Phase 19 — Full test tournament

Run a simulated 12-team, multi-match tournament through the complete lifecycle.

## Phase 20 — Client trial build

- Production deployment
- Demo tournament data
- OBS Browser Source setup
- Operator workflow
- Trial-ready build
