import logging
from .config import load_config
from .capture import MonitorCapture
from .roi import RoiGate,crop
from .events import Stable,Dedup,now
from .api import Api
def main():
 c=load_config();api=Api(c.supabase_url,c.access_token);cap=MonitorCapture(c.capture.monitor,c.capture.fps);gate=RoiGate();player=Stable();dedup=Dedup()
 try:
  for frame in cap.frames():
   if c.enable_ocr:
    try:
     from paddleocr import PaddleOCR
    except ImportError: raise RuntimeError("PaddleOCR is not installed")
    break
   # Capture proof mode: frame acquisition and ROI gates are active without OCR.
   if "player_name" in c.rois: gate.changed("player_name",crop(frame,c.rois["player_name"]))
   if "kill_feed" in c.rois: gate.changed("kill_feed",crop(frame,c.rois["kill_feed"]))
 finally:cap.stop()
if __name__=="__main__":logging.basicConfig(level=logging.INFO);main()