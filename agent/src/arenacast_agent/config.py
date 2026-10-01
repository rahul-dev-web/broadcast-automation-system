from __future__ import annotations
import json
from dataclasses import dataclass
from pathlib import Path
@dataclass(frozen=True)
class Capture: source:str; monitor:int; fps:int
@dataclass(frozen=True)
class Config:
 supabase_url:str; access_token:str; tournament_id:str; match_id:str; capture:Capture; rois:dict; enable_ocr:bool; language:str
def load_config(path="config.json"):
 r=json.loads(Path(path).read_text()); c=r.get("capture",{})
 rois={k:tuple(map(int,v)) for k,v in r.get("rois",{}).items() if isinstance(v,list) and len(v)==4}
 return Config(str(r["supabase_url"]).rstrip("/"),str(r["access_token"]),str(r["tournament_id"]),str(r["match_id"]),Capture(str(c.get("source","monitor")),max(1,int(c.get("monitor",1))),max(1,min(30,int(c.get("fps",15))))),rois,bool(r.get("enable_ocr",False)),str(r.get("ocr",{}).get("language","en")))