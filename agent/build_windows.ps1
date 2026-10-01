Set-StrictMode -Version Latest
$ErrorActionPreference="Stop"
python -m pip install -r requirements.txt
pyinstaller --onefile --name ArenaCastAgent --paths src src/arenacast_agent/main.py
Write-Host "Built dist\\ArenaCastAgent.exe"