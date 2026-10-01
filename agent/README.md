# ArenaCast Local Agent

Windows-side Pro capture/event engine.

- 15 FPS display capture with MSS/OpenCV
- ROI change gating
- optional PaddleOCR adapter
- player-change stabilization after two matching observations
- kill-feed deduplication
- HTTPS ingestion using a Supabase Auth user token
- all detections enter the backend as DETECTED, never OFFICIAL

Use Python 3.11 for the OCR runtime. The OCR dependency is intentionally optional for the capture proof.

Setup:
1. py -3.11 -m venv .venv
2. .\\.venv\\Scripts\\Activate.ps1
3. pip install -r requirements.txt
4. Copy config.example.json to config.json and fill the user access token, tournament and match IDs.
5. python -m arenacast_agent.main

Never store service-role, secret API keys or Google Vision credentials in the agent.

The backend maps OCR IGN values against players.in_game_name and writes operational player state without granting scoring points. Kill events remain detected until operator validation.