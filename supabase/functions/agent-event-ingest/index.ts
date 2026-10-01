import { createClient } from "npm:@supabase/supabase-js@2";
type B={tournamentId:string;matchId:string;eventType:"PLAYER_CHANGED"|"KILL_EVENT";playerIgn?:string;killerIgn?:string;victimIgn?:string;confidence?:number;fingerprint?:string;observedAt?:string};
const H={"content-type":"application/json","access-control-allow-origin":"*","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST,OPTIONS"};
const out=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
const norm=(x:string)=>x.trim().replace(/\s+/g," ").toLocaleLowerCase();
async function fp(b:B){const s=[b.eventType,b.matchId,b.killerIgn??b.playerIgn??"",b.victimIgn??"",b.fingerprint??"",String(Math.floor(Date.parse(b.observedAt??new Date().toISOString())/2000))].join("|");const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,"0")).join("");}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H}); if(req.method!=="POST")return out({error:"POST required"},405);
 try{
  const a=req.headers.get("Authorization");if(!a?.startsWith("Bearer "))return out({error:"Authentication required"},401);
  const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY");if(!url||!service||!anon)return out({error:"Function configuration incomplete"},503);
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});const {data:{user},error:ae}=await auth.auth.getUser(a.slice(7));if(ae||!user)return out({error:"Invalid user session"},401);
  const b=(await req.json()) as B;if(!b.tournamentId||!b.matchId||!b.eventType)return out({error:"tournamentId, matchId and eventType are required"},400);
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:m,error:me}=await db.from("matches").select("id,tournament_id,tournaments!inner(id,organization_id)").eq("id",b.matchId).eq("tournament_id",b.tournamentId).single();if(me||!m)return out({error:"Match not found"},404);
  const t=Array.isArray(m.tournaments)?m.tournaments[0]:m.tournaments;const oid=t?.organization_id;if(!oid)return out({error:"Workspace not found"},400);
  const {data:member}=await db.from("organization_members").select("role").eq("organization_id",oid).eq("user_id",user.id).in("role",["OWNER","OPERATOR"]).maybeSingle();if(!member)return out({error:"Operator access required"},403);
  const {data:sub}=await db.from("subscriptions").select("plan_id,status,expires_at").eq("organization_id",oid).eq("status","ACTIVE").gt("expires_at",new Date().toISOString()).maybeSingle();if(sub?.plan_id!=="PRO")return out({error:"Local OCR automation is a Pro feature"},403);
  const confidence=Math.max(0,Math.min(1,Number(b.confidence??0))),fingerprint=await fp(b);
  if(b.eventType==="PLAYER_CHANGED"){
   const ign=b.playerIgn?.trim();if(!ign)return out({error:"playerIgn is required"},400);
   const {data:p}=await db.from("players").select("id,display_name,in_game_name,team_id,teams!inner(id,tournament_id,team_prefix)").eq("teams.tournament_id",b.tournamentId).ilike("in_game_name",ign).limit(1).maybeSingle();if(!p)return out({error:"Player IGN could not be mapped",ign},422);
   const {data:old}=await db.from("scoring_events").select("id,status,payload").eq("match_id",b.matchId).eq("fingerprint",fingerprint).maybeSingle();if(old)return out({duplicate:true,event:old});
   const {data:e,error:ee}=await db.from("scoring_events").insert({match_id:b.matchId,team_id:p.team_id,event_type:"PLAYER_CHANGED",status:"DETECTED",source:"LOCAL_OCR",fingerprint,detected_at:b.observedAt??new Date().toISOString(),payload:{playerId:p.id,displayName:p.display_name,inGameName:p.in_game_name,teamPrefix:Array.isArray(p.teams)?p.teams[0]?.team_prefix:p.teams?.team_prefix,confidence}}).select("*").single();if(ee)throw ee;
   await db.from("match_team_state").update({current_player_id:p.id,updated_at:new Date().toISOString()}).eq("match_id",b.matchId).eq("team_id",p.team_id);return out({accepted:true,status:"DETECTED",event:e});
  }
  const killer=b.killerIgn?.trim(),victim=b.victimIgn?.trim();if(!killer||!victim)return out({error:"killerIgn and victimIgn are required"},400);
  const [{data:k},{data:v}]=await Promise.all([db.from("players").select("id,display_name,in_game_name,team_id").eq("teams.tournament_id",b.tournamentId).ilike("in_game_name",killer).limit(1).maybeSingle(),db.from("players").select("id,display_name,in_game_name,team_id").eq("teams.tournament_id",b.tournamentId).ilike("in_game_name",victim).limit(1).maybeSingle()]);
  if(!k||!v)return out({error:"Killer/victim IGN could not be mapped",killer,victim},422);
  const {data:old}=await db.from("scoring_events").select("id,status,payload").eq("match_id",b.matchId).eq("fingerprint",fingerprint).maybeSingle();if(old)return out({duplicate:true,event:old});
  const {data:e,error:ee}=await db.from("scoring_events").insert({match_id:b.matchId,team_id:k.team_id,event_type:"KILL_EVENT",status:"DETECTED",source:"LOCAL_OCR",fingerprint,detected_at:b.observedAt??new Date().toISOString(),payload:{killerPlayerId:k.id,killerIgn:k.in_game_name,killerTeamId:k.team_id,victimPlayerId:v.id,victimIgn:v.in_game_name,victimTeamId:v.team_id,confidence}}).select("*").single();if(ee)throw ee;return out({accepted:true,status:"DETECTED",event:e});
 }catch(e){return out({error:e instanceof Error?e.message:"Agent event processing failed"},500);}
});