import cv2,numpy as np
def crop(frame,rect):
 x,y,w,h=rect; H,W=frame.shape[:2]; x=max(0,x);y=max(0,y);return frame[y:min(H,y+h),x:min(W,x+w)]
class RoiGate:
 def __init__(self,threshold=5.0): self.threshold=threshold;self.last={}
 def changed(self,name,image):
  old=self.last.get(name);self.last[name]=image.copy()
  if old is None or old.shape!=image.shape:return True
  a=cv2.resize(cv2.cvtColor(old,cv2.COLOR_BGR2GRAY),(160,90));b=cv2.resize(cv2.cvtColor(image,cv2.COLOR_BGR2GRAY),(160,90))
  return float(np.mean(cv2.absdiff(a,b)))>=self.threshold