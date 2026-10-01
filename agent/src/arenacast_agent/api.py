import requests
class Api:
 def __init__(self,url,token):self.url=url.rstrip("/");self.h={"Authorization":f"Bearer {token}","Content-Type":"application/json"}
 def ingest(self,payload):
  r=requests.post(self.url+"/functions/v1/agent-event-ingest",headers=self.h,json=payload,timeout=10)
  if not r.ok:raise RuntimeError(r.text[:500])
  return r.json()