from __future__ import annotations
from .capture import MonitorCapture
from .roi import RoiGate,crop
from .events import Stable,Dedup,now
from .ocr import LocalOcr

class EventEngine:
    def __init__(self,config,api,on_frame=None,on_status=None):
        self.config=config;self.api=api;self.on_frame=on_frame;self.on_status=on_status
        self.capture=MonitorCapture(config.capture.monitor,config.capture.fps)
        self.gate=RoiGate();self.player=Stable();self.dedup=Dedup()
        self.ocr=LocalOcr(config.language) if config.enable_ocr else None

    def status(self,message):
        if self.on_status:self.on_status(message)

    def process(self,frame):
        if self.on_frame:self.on_frame(frame)
        if not self.ocr:return
        player_roi=self.config.rois.get("player_name")
        if player_roi:
            image=crop(frame,player_roi)
            if self.gate.changed("player_name",image):
                candidates=self.ocr.read(image)
                if candidates:
                    best=max(candidates,key=lambda x:float(x.get("confidence",0)))
                    if self.player.observe(str(best["text"]),float(best.get("confidence",0))):
                        self.api.ingest({"tournamentId":self.config.tournament_id,"matchId":self.config.match_id,"eventType":"PLAYER_CHANGED","playerIgn":self.player.value,"confidence":round(self.player.confidence(),4),"observedAt":now()})
                        self.status("PLAYER_CHANGED: "+self.player.value)
        kill_roi=self.config.rois.get("kill_feed")
        if kill_roi:
            image=crop(frame,kill_roi)
            if self.gate.changed("kill_feed",image):
                values=[str(x.get("text","")).strip() for x in self.ocr.read(image) if str(x.get("text","")).strip()]
                if len(values)>=2:
                    fp=self.dedup.accept(values[0],values[1])
                    if fp:
                        confidence=min(float(self.ocr.read(image)[0].get("confidence",0)),float(self.ocr.read(image)[1].get("confidence",0)))
                        self.api.ingest({"tournamentId":self.config.tournament_id,"matchId":self.config.match_id,"eventType":"KILL_EVENT","killerIgn":values[0],"victimIgn":values[1],"confidence":round(confidence,4),"fingerprint":fp,"observedAt":now()})
                        self.status("KILL_EVENT: "+values[0]+" -> "+values[1])

    def run(self):
        try:
            self.status("CAPTURE_RUNNING")
            for frame in self.capture.frames():
                self.process(frame)
        except Exception as exc:
            self.status("ERROR: "+str(exc))
        finally:
            self.capture.stop()
            self.status("STOPPED")

    def stop(self):
        self.capture.stop()
