import time,cv2,mss,numpy as np
class MonitorCapture:
 def __init__(self,monitor=1,fps=15): self.monitor=monitor;self.fps=max(1,fps);self.running=False
 def frames(self):
  self.running=True; interval=1/self.fps
  with mss.mss() as s:
   if self.monitor>=len(s.monitors): raise ValueError("Requested monitor is unavailable")
   while self.running:
    start=time.perf_counter(); shot=np.asarray(s.grab(s.monitors[self.monitor]),dtype=np.uint8); yield cv2.cvtColor(shot,cv2.COLOR_BGRA2BGR)
    wait=interval-(time.perf_counter()-start)
    if wait>0: time.sleep(wait)
 def stop(self): self.running=False