import hashlib,time
from datetime import datetime,timezone
def now():return datetime.now(timezone.utc).isoformat()
def norm(v):return " ".join(v.strip().split()).casefold()
class Stable:
 def __init__(self):self.value="";self.count=0;self.sum=0
 def observe(self,value,confidence):
  if norm(value)==norm(self.value):self.count+=1;self.sum+=confidence
  else:self.value=value.strip();self.count=1;self.sum=confidence
  return bool(self.value) and self.count>=2
 def confidence(self):return self.sum/max(1,self.count)
class Dedup:
 def __init__(self):self.seen={}
 def accept(self,killer,victim):
  bucket=int(time.time()/2);key=hashlib.sha256(f"{norm(killer)}|{norm(victim)}|{bucket}".encode()).hexdigest()
  if key in self.seen:return None
  self.seen[key]=time.time();self.seen={k:v for k,v in self.seen.items() if time.time()-v<8};return key