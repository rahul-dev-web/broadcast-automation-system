# Free Fire Tournament Broadcast Automation System

Initial foundation for a Free Fire tournament scoring and broadcast overlay MVP.

## Locked product rules

- Maximum 12 teams per tournament.
- Each team has exactly 5 player slots:
  - Player 1-4: main roster
  - Player 5: optional substitute
- Player identity keeps registered/display name separate from in-game name.
- Manual mode is scoring/result input only; it does not provide observer/player switching.
- OCR mode can support final-result extraction and live observer/player detection as separate capabilities.
- OCR output is always a proposed result until operator review and verification.
- One shared scoring engine is used by manual and OCR inputs.
- Points:
  - 1 kill = 1 point
  - 1st = 12
  - 2nd = 9
  - 3rd = 8
  - 4th = 7
  - 5th = 6
  - 6th = 5
  - 7th = 4
  - 8th = 3
  - 9th = 2
  - 10th = 1
  - 11th = 0
  - 12th = 0
- Presentation modes:
  - PER_MATCH
  - OVERALL_ONLY
  - CUSTOM
- Overall standings are compulsory after the tournament finishes.
- Broadcast lifecycle:
  Setup -> Roster Intro -> Room -> Match -> Review -> PT/Next Match -> Overall -> Thank You.

## Current implementation

Phase 1-4 foundation:
- Next.js + TypeScript app scaffold
- Tournament creation UI
- 12 team slots
- Team name, prefix, optional logo
- 5 player slots with substitute flag
- Registered/display name + in-game name
- Total match count
- Three PT presentation modes
- Custom PT match selector
- Locked scoring constants
- Initial Supabase schema draft
- Cloudflare static-export configuration

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

This repository is being built phase-by-phase. OCR, realtime, OBS integration, review workflow and full automation controller are intentionally implemented after the foundation is validated.
