"use client";

import { useEffect, useState } from "react";
import { LiveOverlay } from "@/components/broadcast/live-overlay";

export default function LiveOverlayPage() {
  const [params,setParams]=useState({tournamentId:"",token:""});
  useEffect(()=>{const s=new URLSearchParams(window.location.search);setParams({tournamentId:s.get("tournament")??"",token:s.get("token")??""});},[]);
  if(!params.tournamentId||!params.token)return <main className="broadcast-live-shell"><div className="broadcast-live-stage"><h1>Broadcast Overlay</h1><p>Use the private OBS URL generated from the tournament dashboard. Tournament ID and broadcast token are required.</p></div></main>;
  return <LiveOverlay tournamentId={params.tournamentId} token={params.token}/>;
}
