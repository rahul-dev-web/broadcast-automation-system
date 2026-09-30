"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export function ObsUrlButton({ tournamentId }: { tournamentId: string }) {
 const [url,setUrl]=useState("");
 const [error,setError]=useState("");
 async function generate(){const {data,error:e}=await supabase.rpc("issue_broadcast_token",{p_tournament_id:tournamentId});if(e){setError(e.message);return;}setUrl(window.location.origin+"/overlay/live?tournament="+encodeURIComponent(tournamentId)+"&token="+encodeURIComponent(data));}
 return <div className="saas-actions"><button className="saas-button" onClick={generate}>Generate OBS URL</button>{url&&<button className="saas-button" onClick={()=>void navigator.clipboard.writeText(url)}>Copy URL</button>}{error&&<span className="saas-muted">{error}</span>}{url&&<div className="saas-token">{url}</div>}</div>;
}
