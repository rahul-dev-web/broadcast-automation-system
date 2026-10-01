"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  ANIMATION_TYPES,
  ASSET_SLOTS,
  DESIGN_STAGES,
  cloneDesignConfig,
  normalizeDesign,
  designCssVariables,
  type BroadcastDesignAsset,
  type BroadcastDesignConfig,
  type BroadcastDesignRecord,
  type DesignStage,
} from "@/lib/broadcast-design";
import styles from "./design-studio.module.css";

type Tournament = { id: string; name: string; design_id: string | null };

const stageLabels: Record<DesignStage, string> = {
  ROSTER_1: "Roster",
  ROSTER_2: "Roster 2",
  ROOM: "Room",
  MATCH_LIVE: "Live HUD",
  MATCH_REVIEW: "Review",
  MATCH_VERIFIED: "Result",
  MATCH_PT: "Match PT",
  OVERALL: "Overall",
  THANK_YOU: "Thank You",
};

const animationLabels: Record<string, string> = {
  NONE: "None", FADE: "Fade", SLIDE_LEFT: "Slide left", SLIDE_RIGHT: "Slide right",
  SLIDE_UP: "Slide up", SLIDE_DOWN: "Slide down", SCALE: "Scale", REVEAL: "Reveal",
  WIPE: "Wipe", CLIP: "Clip", SCAN_REVEAL: "Scan reveal", GLITCH_OUT: "Glitch out",
  DATA_IN: "Data in", DIGITAL_WIPE: "Digital wipe",
};

function stageBackgroundSlot(stage: DesignStage) {
  if (stage === "ROSTER_1" || stage === "ROSTER_2") return "background_roster";
  if (stage === "ROOM") return "background_room";
  if (stage === "MATCH_LIVE" || stage === "MATCH_REVIEW") return "background_live";
  if (stage === "MATCH_VERIFIED" || stage === "MATCH_PT") return "background_result";
  if (stage === "OVERALL") return "background_overall";
  return "outro_thank_you";
}


const previewTeams = Array.from({ length: 12 }, (_, index) => ({
  number: index + 1,
  prefix: ["RDS", "IGL", "TJF", "CLZ", "NXT", "VTX", "FLC", "ARC", "ZEN", "VPR", "NOVA", "RGE"][index],
}));

function previewDesignClass(style: string) {
  return style === "ANGULAR" ? "design-angular-arena"
    : style === "CINEMATIC" ? "design-championship-cinematic"
    : style === "GRID" ? "design-future-grid"
    : "design-minimal";
}

function DesignPreview({
  design,
  stage,
  stageLabel,
  backgroundUrl,
  backgroundMime,
  logoUrl,
  headingFontUrl,
  bodyFontUrl,
  name,
}: {
  design: BroadcastDesignConfig;
  stage: DesignStage;
  stageLabel: string;
  backgroundUrl: string | null;
  backgroundMime: string | null;
  logoUrl: string | null;
  headingFontUrl: string | null;
  bodyFontUrl: string | null;
  name: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const updateScale = () => setScale(Math.max(0.15, Math.min(1, element.clientWidth / 1920)));
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const policy = design.stageDefaults[stage] ?? { background: "FULL", panel: "CLEAN" };
  const isTransparent = policy.background === "TRANSPARENT";
  const vars = {
    ...designCssVariables(design, stage),
    ...(headingFontUrl ? { "--theme-heading-font": "BroadcastPreviewHeading" } : {}),
    ...(bodyFontUrl ? { "--theme-body-font": "BroadcastPreviewBody" } : {}),
  } as CSSProperties;
  const motionType = design.animations.stage.type.toLowerCase().replaceAll("_", "-");
  const densityClass = `density-${design.layout.density.toLowerCase()}`;
  const rootClass = `ff-broadcast-root stage-${stage.toLowerCase()} ${previewDesignClass(design.layout.style)} ${densityClass} ${styles[`motion-${motionType}`] ?? ""}`;
  return (
    <div className={styles.previewViewport} ref={viewportRef}>
      <div className={styles.previewCanvas} style={{ transform: `scale(${scale})` }}>
        <div className={rootClass} style={vars}>
        {(headingFontUrl || bodyFontUrl) && <style>{`
          ${headingFontUrl ? `@font-face{font-family:BroadcastPreviewHeading;src:url("${headingFontUrl}");font-display:swap;}` : ""}
          ${bodyFontUrl ? `@font-face{font-family:BroadcastPreviewBody;src:url("${bodyFontUrl}");font-display:swap;}` : ""}
        `}</style>}
        {backgroundUrl && !isTransparent && backgroundMime?.startsWith("video/") && <video className="ff-design-background" src={backgroundUrl} autoPlay muted loop playsInline />}
        {backgroundUrl && !isTransparent && backgroundMime?.startsWith("image/") && <img className="ff-design-background" src={backgroundUrl} alt="" />}
        {isTransparent && <div className={styles.transparencyGrid} />}
        <div className="ff-bg" />
        {logoUrl && <img className="ff-design-logo" src={logoUrl} alt="" />}
        <div className="ff-global-header">
          <div className="ff-brand"><span className="ff-brand-mark">BA</span><div><strong>{name || "TOURNAMENT"}</strong><small>OFFICIAL TOURNAMENT BROADCAST</small></div></div>
        </div>
        {(stage === "ROSTER_1" || stage === "ROSTER_2") && (
          <section className="ff-stage ff-lineup-stage" style={{ animationDuration: `${design.animations.stage.durationMs}ms` }}>
            <div className="ff-corner ff-corner-tl" /><div className="ff-corner ff-corner-tr" /><div className="ff-corner ff-corner-bl" /><div className="ff-corner ff-corner-br" />
            <div className="ff-title-block"><span>{name || "TOURNAMENT"}</span><h1>TEAM <em>LINEUP</em></h1><i>{stage === "ROSTER_1" ? "01" : "02"} / 02</i></div>
            <div className="ff-lineup-grid">
              {previewTeams.slice(stage === "ROSTER_1" ? 0 : 6, stage === "ROSTER_1" ? 6 : 12).map((team, i) => (
                <article className="ff-lineup-card" key={team.number} style={{ "--delay": `${i * 70}ms` } as CSSProperties}>
                  <div className="ff-lineup-card-head"><span className="ff-team-logo ff-team-logo-fallback">{team.prefix}</span><div><strong>{team.prefix} ESPORTS</strong><span>{team.prefix}</span></div><b>#{String(team.number).padStart(2, "0")}</b></div>
                  <div className="ff-player-strip">{[1,2,3,4].map(slot => <div className="ff-player-chip" key={slot}><span>0{slot}</span><strong>{team.prefix}_PLAYER</strong></div>)}</div>
                </article>
              ))}
            </div>
            <div className="ff-stage-footer"><span>OFFICIAL TOURNAMENT BROADCAST</span><b>LIVE PRODUCTION</b></div>
          </section>
        )}
        {stage === "ROOM" && (
          <section className="ff-stage ff-room-stage" style={{ animationDuration: `${design.animations.stage.durationMs}ms` }}><div className="ff-room-orbit" /><div className="ff-room-copy"><span className="ff-overline">MATCH 01 · {name || "TOURNAMENT"}</span><h1>GET<br /><em>READY</em></h1><p>ROOM IS OPEN · 12 TEAMS REGISTERED · 01 / LIVE SERIES</p><div className="ff-ready-pill"><span /> MATCH READY</div></div><div className="ff-room-grid">{previewTeams.slice(0,8).map(team => <div className="ff-room-team" key={team.number}><b>{String(team.number).padStart(2,"0")}</b><strong>{team.prefix}</strong><span>{team.prefix} ESPORTS</span></div>)}</div><div className="ff-action-bar"><span>ACTION STARTS WHEN THE MATCH GOES LIVE</span><strong>POINT RUSH</strong></div></section>
        )}
        {(stage === "MATCH_LIVE" || stage === "MATCH_REVIEW") && (
          <section className="ff-stage ff-live-stage" style={{ animationDuration: `${design.animations.stage.durationMs}ms` }}><div className="ff-live-top"><div className="ff-live-match">MATCH 01</div><div className="ff-live-center">{stage === "MATCH_LIVE" ? "LIVE" : "REVIEW"} <b>•</b> 12 TEAMS</div><div className="ff-live-feed">BROADCAST <span /></div></div><div className="ff-standings"><div className="ff-standings-title"><strong>LIVE STANDINGS</strong><span>PTS</span></div><div className="ff-standings-legend">ALIVE / ELIMINATED</div>{previewTeams.slice(0,7).map((team,i)=><div className="ff-standing-row" key={team.number}><b>{i+1}</b><strong>{team.prefix}</strong><em>{32-i*3}</em></div>)}</div><div className="ff-player-focus"><div className="ff-focus-accent" /><div className="ff-focus-team">PLAYER FOCUS <span>{previewTeams[0].prefix}</span></div><strong>{previewTeams[0].prefix}_PLAYER</strong><div className="ff-focus-meta">4 KILLS · ALIVE · MATCH 01</div></div><div className="ff-live-score-strip">{previewTeams.map((team,i)=><div className="ff-live-score" key={team.number}><b>{i+1}</b><strong>{team.prefix}</strong><span>{12-i} KILLS</span></div>)}</div></section>
        )}
        {(stage === "MATCH_VERIFIED" || stage === "MATCH_PT") && (
          <section className="ff-stage ff-results-stage" style={{ animationDuration: `${design.animations.stage.durationMs}ms` }}><div className="ff-results-heading"><div><span className="ff-overline">MATCH 01 · VERIFIED</span><h1>MATCH <em>RESULT</em></h1></div><b>POINTS TABLE</b></div><div className="ff-results-table"><div className="ff-results-head"><span>#</span><span>TEAM</span><span>KILLS</span><span>PLACE</span><span>PTS</span></div>{previewTeams.slice(0,7).map((team,i)=><div className={`ff-results-row ${i===0 ? "top-row" : ""}`} key={team.number}><b>{i+1}</b><strong>{team.prefix} ESPORTS</strong><span>{12-i}</span><span>{i+1}</span><em>{32-i*3}</em></div>)}</div></section>
        )}
        {stage === "OVERALL" && <section className="ff-stage ff-overall-stage" style={{ animationDuration: `${design.animations.stage.durationMs}ms` }}><div className="ff-overall-title"><span className="ff-overline">TOURNAMENT LEADERBOARD</span><h1>OVERALL <em>STANDINGS</em></h1><b>AFTER MATCH 01</b></div><div className="ff-overall-table">{previewTeams.slice(0,7).map((team,i)=><div className={`ff-overall-row ${i<3 ? "podium-row" : ""}`} key={team.number}><b>{i+1}</b><strong>{team.prefix}</strong><span>12 KILLS</span><i>+{32-i*3} PTS</i><em>{32-i*3}</em></div>)}</div></section>}
        {stage === "THANK_YOU" && <section className="ff-stage ff-simple-stage" style={{ animationDuration: `${design.animations.stage.durationMs}ms` }}><span>THANK YOU FOR WATCHING</span><h1>SEE YOU<br />NEXT MATCH</h1><p>{name || "TOURNAMENT"} · OFFICIAL BROADCAST</p></section>}
        <div className="ff-global-footer"><span>DESIGN PREVIEW</span><i>•</i><span>{stageLabel.toUpperCase()}</span><i>•</i><span>{design.layout.style}</span></div>
        </div>
      </div>
    </div>
  );
}

export function BroadcastDesignStudio() {
  const [designs, setDesigns] = useState<BroadcastDesignRecord[]>([]);
  const [assets, setAssets] = useState<BroadcastDesignAsset[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<BroadcastDesignConfig>(normalizeDesign());
  const [draftName, setDraftName] = useState("New Broadcast Design");
  const [draftDescription, setDraftDescription] = useState("");
  const [stage, setStage] = useState<DesignStage>("MATCH_LIVE");
  const [assignment, setAssignment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selected = designs.find(item => item.id === selectedId) ?? null;
  const isSystem = selected?.design_type === "SYSTEM";
  const canEdit = role === "OWNER" || role === "OPERATOR";

  async function load() {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/auth/login/?next=/broadcast/designs/";
      return;
    }
    setUserId(user.id);

    const { data: member, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id,role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (memberError || !member) {
      setError(memberError?.message ?? "Workspace not found.");
      setLoading(false);
      return;
    }

    setOrganizationId(member.organization_id);
    setRole(member.role);

    const [designResult, assetResult, tournamentResult] = await Promise.all([
      supabase.from("broadcast_designs").select("id,organization_id,name,description,design_type,preset_id,version,config").order("design_type").order("created_at"),
      supabase.from("broadcast_design_assets").select("*").eq("organization_id", member.organization_id).order("created_at"),
      supabase.from("tournaments").select("id,name,design_id").eq("organization_id", member.organization_id).order("created_at", { ascending: false }),
    ]);

    if (designResult.error) setError(designResult.error.message);
    if (assetResult.error) setError(assetResult.error.message);
    if (tournamentResult.error) setError(tournamentResult.error.message);

    const nextDesigns = (designResult.data ?? []) as BroadcastDesignRecord[];
    setDesigns(nextDesigns);
    setAssets((assetResult.data ?? []) as BroadcastDesignAsset[]);
    setTournaments((tournamentResult.data ?? []) as Tournament[]);

    if (!selectedId && nextDesigns[0]) selectDesign(nextDesigns[0], tournamentResult.data ?? [], assetResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const systemDesigns = useMemo(() => designs.filter(item => item.design_type === "SYSTEM"), [designs]);
  const customDesigns = useMemo(() => designs.filter(item => item.design_type === "CUSTOM"), [designs]);
  const selectedAssets = useMemo(() => assets.filter(item => item.design_id === selectedId), [assets, selectedId]);
  const stageAsset = selectedAssets.find(item => item.slot === stageBackgroundSlot(stage));
  const stageAssetUrl = typeof stageAsset?.config?.publicUrl === "string" ? stageAsset.config.publicUrl : null;
  const currentStagePolicy = draft.stageDefaults[stage] ?? { background: "FULL", panel: "CLEAN" };

  function selectDesign(design: BroadcastDesignRecord, tournamentRows = tournaments, assetRows = assets) {
    setSelectedId(design.id);
    setDraft(normalizeDesign(design.config));
    setDraftName(design.name);
    setDraftDescription(design.description ?? "");
    setAssignment(tournamentRows.find(item => item.design_id === design.id)?.id ?? "");
    setAssets(assetRows as BroadcastDesignAsset[]);
    setMessage("");
    setError("");
  }

  function newDesign() {
    const base = cloneDesignConfig(systemDesigns[0]?.config ?? normalizeDesign());
    setSelectedId("");
    setDraft(base);
    setDraftName("New Broadcast Design");
    setDraftDescription("Custom tournament broadcast design.");
    setAssignment("");
    setMessage("");
    setError("");
  }

  function cloneSelected() {
    if (!selected) return;
    setSelectedId("");
    setDraft(cloneDesignConfig(selected.config));
    setDraftName(`${selected.name} Custom`);
    setDraftDescription(selected.description ?? "Custom broadcast design.");
    setAssignment("");
    setMessage("");
    setError("");
  }

  function updateAnimation(
    key: "entry" | "exit" | "row" | "stage",
    field: "type" | "durationMs" | "delayMs" | "staggerMs" | "easing",
    value: string,
  ) {
    setDraft(current => ({
      ...current,
      animations: {
        ...current.animations,
        [key]: { ...current.animations[key], [field]: field === "type" || field === "easing" ? value : Number(value) || 0 },
      },
    }));
  }

  function updateStagePolicy(background: "FULL" | "TRANSPARENT") {
    setDraft(current => ({
      ...current,
      stageDefaults: {
        ...current.stageDefaults,
        [stage]: { ...current.stageDefaults[stage], background },
      },
    }));
  }

  async function saveDesign() {
    if (!organizationId || !canEdit) return;
    setSaving(true);
    setError("");
    setMessage("");
    const payload = {
      name: draftName.trim() || "Custom Broadcast Design",
      description: draftDescription.trim() || null,
      config: normalizeDesign(draft),
      updated_at: new Date().toISOString(),
    };

    if (selected && selected.design_type === "CUSTOM") {
      const { error: updateError } = await supabase.from("broadcast_designs").update({
        ...payload,
        version: selected.version + 1,
      }).eq("id", selected.id);
      if (updateError) setError(updateError.message);
      else {
        setDesigns(current => current.map(item => item.id === selected.id ? { ...item, ...payload, version: selected.version + 1 } as BroadcastDesignRecord : item));
        setMessage("Design saved. Existing tournaments keep their assigned design version until you update them.");
      }
    } else {
      const { data, error: insertError } = await supabase.from("broadcast_designs").insert({
        organization_id: organizationId,
        name: payload.name,
        description: payload.description,
        design_type: "CUSTOM",
        config: payload.config,
        created_by: userId,
      }).select("id,organization_id,name,description,design_type,preset_id,version,config").single();

      if (insertError) setError(insertError.message);
      else if (data) {
        setSelectedId(data.id);
        setDesigns(current => [...current, data as BroadcastDesignRecord]);
        setMessage("Custom design created. You can now upload assets into its slots.");
      }
    }
    setSaving(false);
  }

  async function assignDesign() {
    if (!assignment || !selectedId) return;
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase.from("tournaments").update({
      design_id: selectedId,
    }).eq("id", assignment);
    if (updateError) setError(updateError.message);
    else {
      setTournaments(current => current.map(item => item.id === assignment ? { ...item, design_id: selectedId } : item));
      setMessage("Design synced to the tournament. The broadcast overlay will use this design pack directly.");
    }
    setSaving(false);
  }

  async function clearAssignment() {
    if (!assignment) return;
    setSaving(true);
    const { error: updateError } = await supabase.from("tournaments").update({ design_id: null }).eq("id", assignment);
    if (updateError) setError(updateError.message);
    else {
      setTournaments(current => current.map(item => item.id === assignment ? { ...item, design_id: null } : item));
      setMessage("Tournament design assignment cleared.");
    }
    setSaving(false);
  }

  async function uploadAsset(slot: typeof ASSET_SLOTS[number], event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !organizationId || !selectedId || isSystem || !canEdit) return;

    setUploadingSlot(slot.slot);
    setError("");
    setMessage("");

    try {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
      const path = `${organizationId}/${selectedId}/${slot.slot}/${crypto.randomUUID()}-${safeName}`;
      const upload = await supabase.storage.from("broadcast-assets").upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upload.error) throw upload.error;

      const publicUrl = supabase.storage.from("broadcast-assets").getPublicUrl(path).data.publicUrl;
      let width: number | null = null;
      let height: number | null = null;
      let durationMs: number | null = null;

      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        await new Promise<void>(resolve => {
          const image = new Image();
          image.onload = () => { width = image.naturalWidth; height = image.naturalHeight; URL.revokeObjectURL(url); resolve(); };
          image.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          image.src = url;
        });
      } else if (file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file);
        await new Promise<void>(resolve => {
          const video = document.createElement("video");
          video.onloadedmetadata = () => { width = video.videoWidth; height = video.videoHeight; durationMs = Math.round(video.duration * 1000); URL.revokeObjectURL(url); resolve(); };
          video.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          video.src = url;
        });
      }

      const { data, error: insertError } = await supabase.from("broadcast_design_assets").insert({
        design_id: selectedId,
        organization_id: organizationId,
        asset_type: slot.type,
        stage: stage,
        slot: slot.slot,
        name: file.name,
        storage_path: path,
        mime_type: file.type || null,
        file_size: file.size,
        width,
        height,
        duration_ms: durationMs,
        config: { publicUrl },
        created_by: userId,
      }).select("*").single();

      if (insertError) throw insertError;
      if (data) setAssets(current => [...current.filter(item => item.slot !== slot.slot || item.design_id !== selectedId), data as BroadcastDesignAsset]);
      setMessage(`${slot.label} uploaded. The file is stored under this design's organization-scoped folder.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Asset upload failed.");
    } finally {
      setUploadingSlot("");
    }
  }

  async function deleteAsset(asset: BroadcastDesignAsset) {
    if (!canEdit || isSystem) return;
    if (!window.confirm(`Delete "${asset.name}" from this design?`)) return;
    setSaving(true);
    const storageResult = await supabase.storage.from("broadcast-assets").remove([asset.storage_path]);
    const dbResult = await supabase.from("broadcast_design_assets").delete().eq("id", asset.id);
    if (storageResult.error) setError(storageResult.error.message);
    if (dbResult.error) setError(dbResult.error.message);
    if (!storageResult.error && !dbResult.error) {
      setAssets(current => current.filter(item => item.id !== asset.id));
      setMessage("Asset removed.");
    }
    setSaving(false);
  }

  if (loading) return <main className="shell"><div className="panel">Loading broadcast design studio…</div></main>;

  return (
    <main className={`shell ${styles.studio}`}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">BROADCAST / DESIGN STUDIO</p>
          <h1>Build a reusable broadcast design pack</h1>
          <p className="muted">Designs define typography, motion, layout and asset slots. Uploaded files are inputs only—the renderer never assumes a specific tournament graphic.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className="ghost-button" href="/dashboard/">Dashboard</Link>
          <button className="primary-button" onClick={newDesign} disabled={!canEdit}>New custom design</button>
        </div>
      </header>

      {message && <div className="success-banner">{message}</div>}
      {error && <div className="error-banner">{error}</div>}

      <section className={styles.layout}>
        <aside className={`panel ${styles.library}`}>
          <div className={styles.libraryHeader}><div><p className="eyebrow">SYSTEM DESIGNS</p><h2>Four visual directions</h2></div></div>
          <div className={styles.cards}>
            {systemDesigns.map(item => (
              <button key={item.id} className={`${styles.card} ${selectedId === item.id ? styles.active : ""}`} onClick={() => selectDesign(item)}>
                <span className={`${styles.cardVisual} ${styles[item.config.layout.style.toLowerCase()] ?? ""}`}>
                  <i /><b>{item.config.animations.entry.type.replaceAll("_", " ")}</b>
                </span>
                <strong>{item.name}</strong>
                <small>{item.config.layout.style} · {item.config.layout.density}</small>
                <span>{item.description}</span>
              </button>
            ))}
          </div>

          <div className={styles.libraryHeader}><div><p className="eyebrow">MY DESIGNS</p><h2>Custom design packs</h2></div></div>
          {customDesigns.length === 0 ? <p className="muted">No custom design yet. Clone a system design or create one from scratch.</p> : (
            <div className={styles.cards}>
              {customDesigns.map(item => (
                <button key={item.id} className={`${styles.card} ${selectedId === item.id ? styles.active : ""}`} onClick={() => selectDesign(item)}>
                  <span className={styles.cardVisual}><i /><b>CUSTOM</b></span>
                  <strong>{item.name}</strong>
                  <small>VERSION {item.version}</small>
                  <span>{item.description || "Custom broadcast package."}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className={styles.editor}>
          <div className={`panel ${styles.previewPanel}`}>
            <div className={styles.editorHead}>
              <div><p className="eyebrow">LIVE PREVIEW</p><h2>{draftName}</h2></div>
              <div className={styles.stageTabs}>{DESIGN_STAGES.map(item => <button key={item} className={stage === item ? styles.selectedTab : ""} onClick={() => setStage(item)}>{stageLabels[item]}</button>)}</div>
            </div>
            <DesignPreview
              design={draft}
              stage={stage}
              stageLabel={stageLabels[stage]}
              backgroundUrl={stageAssetUrl}
              backgroundMime={stageAsset?.mime_type ?? null}
              logoUrl={selectedAssets.find(item => item.slot === "logo_broadcast")?.config?.publicUrl as string | undefined ?? null}
              headingFontUrl={selectedAssets.find(item => item.slot === "font_heading" || item.slot === "font_primary")?.config?.publicUrl as string | undefined ?? null}
              bodyFontUrl={selectedAssets.find(item => item.slot === "font_body" || item.slot === "font_primary")?.config?.publicUrl as string | undefined ?? null}
              name={draftName}
            />
            <div className={styles.previewNote}>
              <strong>{currentStagePolicy.background === "TRANSPARENT" ? "Transparent gameplay-safe stage" : "Full-scene stage"}</strong>
              <span>{stageAsset ? `${stageAsset.name} is assigned to ${stageLabels[stage]}.` : "No asset uploaded for this stage slot yet; the renderer will use the design fallback."}</span>
            </div>
          </div>

          <div className={`panel ${styles.controls}`}>
            <div className={styles.editorHead}>
              <div><p className="eyebrow">DESIGN CONFIGURATION</p><h2>Visual language</h2></div>
              <span className="status-pill">{isSystem ? "SYSTEM · READ ONLY" : "CUSTOM · EDITABLE"}</span>
            </div>

            <div className="form-grid two">
              <label className="field"><span>Design name</span><input value={draftName} onChange={e => setDraftName(e.target.value)} disabled={isSystem || !canEdit} /></label>
            </div>
            <label className="field"><span>Description</span><textarea value={draftDescription} onChange={e => setDraftDescription(e.target.value)} rows={2} disabled={isSystem || !canEdit} /></label>

            <div className={styles.configSection}>
              <div className={styles.sectionTitle}><strong>Layout</strong><span className="muted">This changes structure, not uploaded artwork.</span></div>
              <div className="form-grid three">
                <label className="field"><span>Design language</span><select value={draft.layout.style} onChange={e => setDraft(c => ({ ...c, layout: { ...c.layout, style: e.target.value } }))} disabled={isSystem || !canEdit}><option>ANGULAR</option><option>CINEMATIC</option><option>GRID</option><option>MINIMAL</option></select></label>
                <label className="field"><span>Density</span><select value={draft.layout.density} onChange={e => setDraft(c => ({ ...c, layout: { ...c.layout, density: e.target.value as BroadcastDesignConfig["layout"]["density"] } }))} disabled={isSystem || !canEdit}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></label>
                <label className="field"><span>Safe margin (px)</span><input type="number" min={0} max={160} value={draft.layout.safeMargin} onChange={e => setDraft(c => ({ ...c, layout: { ...c.layout, safeMargin: Number(e.target.value) || 0 } }))} disabled={isSystem || !canEdit} /></label>
              </div>
            </div>

            <div className={styles.configSection}>
              <div className={styles.sectionTitle}><strong>Animation language</strong><span className="muted">Four independent motion controls.</span></div>
              {(["entry","exit","row","stage"] as const).map(key => (
                <div className={styles.animationRow} key={key}>
                  <strong>{key.toUpperCase()}</strong>
                  <select value={draft.animations[key].type} onChange={e => updateAnimation(key, "type", e.target.value)} disabled={isSystem || !canEdit}>{ANIMATION_TYPES.map(type => <option key={type} value={type}>{animationLabels[type]}</option>)}</select>
                  <input type="number" min={0} max={5000} value={draft.animations[key].durationMs} onChange={e => updateAnimation(key, "durationMs", e.target.value)} disabled={isSystem || !canEdit} />
                  <input value={draft.animations[key].easing} onChange={e => updateAnimation(key, "easing", e.target.value)} disabled={isSystem || !canEdit} />
                </div>
              ))}
            </div>

            <div className={styles.configSection}>
              <div className={styles.sectionTitle}><strong>Stage canvas policy</strong><span className="muted">Live gameplay remains transparent by default.</span></div>
              <div className={styles.stagePolicyGrid}>
                {DESIGN_STAGES.map(item => (
                  <button key={item} className={`${styles.policyCard} ${draft.stageDefaults[item]?.background === "TRANSPARENT" ? styles.transparent : ""}`} onClick={() => { setStage(item); updateStagePolicy(draft.stageDefaults[item]?.background === "TRANSPARENT" ? "FULL" : "TRANSPARENT"); }} disabled={isSystem || !canEdit}>
                    <strong>{stageLabels[item]}</strong><span>{draft.stageDefaults[item]?.background === "TRANSPARENT" ? "TRANSPARENT" : "FULL CANVAS"}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.actions}>
              {isSystem ? <button className="primary-button" onClick={cloneSelected} disabled={!canEdit}>Clone & customize</button> : <button className="primary-button" onClick={() => void saveDesign()} disabled={!canEdit || saving}>{saving ? "Saving…" : selected ? "Save design" : "Create design"}</button>}
            </div>
          </div>

          <div className={`panel ${styles.assetsPanel}`}>
            <div className={styles.editorHead}>
              <div><p className="eyebrow">ASSET SLOTS</p><h2>Upload your own files</h2></div>
              <span className="status-pill">NO ARTWORK HARD-CODED</span>
            </div>
            <p className="muted">These are generic slots. Upload any compatible font, logo, image, video or transition; the design pack stores the asset reference and metadata.</p>
            {!selectedId || isSystem ? (
              <div className={styles.assetLock}>{isSystem ? "Clone this system design first to upload assets." : "Create the custom design first, then upload assets."}</div>
            ) : (
              <div className={styles.assetGrid}>
                {ASSET_SLOTS.map(slot => {
                  const asset = selectedAssets.find(item => item.slot === slot.slot);
                  return (
                    <div className={styles.assetCard} key={slot.slot}>
                      <div><strong>{slot.label}</strong><small>{slot.slot} · {slot.type}</small></div>
                      {asset ? (
                        <div className={styles.assetMeta}>
                          <span>{asset.name}</span>
                          <small>{asset.width && asset.height ? `${asset.width}×${asset.height}` : ""}{asset.duration_ms ? ` · ${(asset.duration_ms / 1000).toFixed(1)}s` : ""}</small>
                          <button className="ghost-button small" onClick={() => void deleteAsset(asset)} disabled={saving}>Remove</button>
                        </div>
                      ) : <label className={styles.uploadButton}><input type="file" accept={slot.accept} onChange={e => void uploadAsset(slot, e)} disabled={Boolean(uploadingSlot) || saving} /><span>{uploadingSlot === slot.slot ? "Uploading…" : "Upload file"}</span></label>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`panel ${styles.assignment}`}>
            <div className={styles.editorHead}>
              <div><p className="eyebrow">TOURNAMENT SYNC</p><h2>Assign the design pack</h2></div>
              <span className="status-pill">DESIGN → OVERLAY</span>
            </div>
            <p className="muted">A tournament stores one broadcast design pack. The live browser source resolves that design directly, so there is no second theme selection.</p>
            <div className="form-grid two">
              <label className="field"><span>Tournament</span><select value={assignment} onChange={e => setAssignment(e.target.value)} disabled={!selectedId || saving}><option value="">Choose tournament…</option>{tournaments.map(item => <option key={item.id} value={item.id}>{item.name}{item.design_id === selectedId ? " · current" : ""}</option>)}</select></label>
            </div>
            <div className={styles.actions}><button className="primary-button" onClick={() => void assignDesign()} disabled={!selectedId || !assignment || saving}>Assign design</button><button className="ghost-button" onClick={() => void clearAssignment()} disabled={!assignment || saving}>Clear</button></div>
          </div>
        </section>
      </section>
    </main>
  );
}
