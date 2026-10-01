from __future__ import annotations
import threading
import tkinter as tk
from tkinter import ttk
import cv2
import mss

from .api import Api
from .config import load_config,AgentConfig,Capture
from .engine import EventEngine

class AgentWindow:
    def __init__(self):
        self.root=tk.Tk();self.root.title("ArenaCast Local Agent");self.root.geometry("1100x760")
        self.running=False;self.engine=None;self.thread=None;self.photo=None
        self.status=tk.StringVar(value="SOURCE_NOT_CONNECTED");self.fps=tk.StringVar(value="15");self.monitor=tk.StringVar(value="1")
        self._build()

    def _build(self):
        top=ttk.Frame(self.root,padding=12);top.pack(fill="x")
        ttk.Label(top,text="ARENACAST LOCAL AGENT",font=("Segoe UI",18,"bold")).pack(anchor="w")
        ttk.Label(top,textvariable=self.status).pack(anchor="w")
        controls=ttk.Frame(self.root,padding=12);controls.pack(fill="x")
        ttk.Label(controls,text="Display").pack(side="left");self.monitors=ttk.Combobox(controls,textvariable=self.monitor,width=8,state="readonly",values=[str(i) for i in range(1,len(mss.mss().monitors))]);self.monitors.pack(side="left",padx=6)
        ttk.Label(controls,text="FPS").pack(side="left");ttk.Entry(controls,textvariable=self.fps,width=6).pack(side="left",padx=6)
        self.start=ttk.Button(controls,text="Start Capture",command=self.start_capture);self.start.pack(side="left",padx=6)
        ttk.Button(controls,text="Stop",command=self.stop_capture).pack(side="left",padx=6)
        self.preview=ttk.Label(self.root,text="Preview unavailable");self.preview.pack(fill="both",expand=True,padx=12,pady=12)
        self.root.protocol("WM_DELETE_WINDOW",self.close)

    def start_capture(self):
        if self.running:return
        try:
            base=load_config()
            cfg=AgentConfig(base.supabase_url,base.access_token,base.tournament_id,base.match_id,Capture(base.capture.source,max(1,int(self.monitor.get())),max(1,int(self.fps.get()))),base.rois,base.enable_ocr,base.language)
            self.engine=EventEngine(cfg,Api(cfg.supabase_url,cfg.access_token),self.show_frame,self.set_status)
            self.running=True;self.start.configure(state="disabled");threading.Thread(target=self.engine.run,daemon=True).start()
        except Exception as exc:self.set_status("ERROR: "+str(exc))

    def stop_capture(self):
        self.running=False
        if self.engine:self.engine.stop()
        self.start.configure(state="normal")

    def set_status(self,value):
        self.root.after(0,lambda:self.status.set(value))

    def show_frame(self,frame):
        small=cv2.resize(frame,(960,540))
        ok,encoded=cv2.imencode(".ppm",small)
        if not ok:return
        self.root.after(0,lambda data=encoded.tobytes():self._show(data))

    def _show(self,data):
        try:
            self.photo=tk.PhotoImage(data=data,format="PPM")
            self.preview.configure(image=self.photo,text="")
        except tk.TclError: pass

    def close(self):
        self.stop_capture();self.root.destroy()

    def run(self):self.root.mainloop()
