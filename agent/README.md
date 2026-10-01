# ArenaCast Local Agent

Windows desktop capture and event engine for ArenaCast Pro.

## Current milestone

- Tkinter Windows UI
- display selection
- target FPS control
- live capture preview
- OpenCV ROI change gates
- optional PaddleOCR
- player-change stabilization
- kill-feed deduplication
- authenticated Supabase event ingestion
- DETECTED events only; operator approval remains authoritative

Use Python 3.11 for the OCR runtime. Capture mode can run without PaddleOCR.

Setup:
1. py -3.11 -m venv .venv
2. .\\.venv\\Scripts\\Activate.ps1
3. pip install -r requirements.txt
4. Copy config.example.json to config.json and fill the Supabase URL, user access token, tournament ID and match ID.
5. python -m arenacast_agent.main

Never store service-role, secret API keys or Google Vision credentials in the Agent.

The exact Free Fire kill-feed grammar is intentionally profile-driven. The generic engine detects candidate text changes but does not assume an arbitrary OCR string is a valid kill without the database mapping and server validation.
