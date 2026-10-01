"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  ANIMATION_TYPES,
  ASSET_SLOTS,
  DESIGN_STAGES,
  cloneDesignConfig,
  normalizeDesign,
  type BroadcastDesignAsset,
  type BroadcastDesignConfig,
  type BroadcastDesignRecord,
  type DesignStage,
} from "@/lib/broadcast-design";
import styles from "./design-studio.module.css";

type ThemeOption = { id: string; name: string; theme_type: "SYSTEM" | "CUSTOM"; preset_id: string | null };
type Tournament = { id: string; name: string; design_id: string | null; theme_id: string | null };

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

export function BroadcastDesignStudio() {
  const [designs, setDesigns] = useState<BroadcastDesignRecord[]>([]);
  const [assets, setAssets] = useState<BroadcastDesignAsset[]>([]);
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<BroadcastDesignConfig>(normalizeDesign());
  const [draftName, setDraftName] = useState("New Broadcast Design");
  const [draftDescription, setDraftDescription] = useState("");
  const [themeId, setThemeId] = useState("");
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

    const [designResult, assetResult, themeResult, tournamentResult] = await Promise.all([
      supabase.from("broadcast_designs").select("id,organization_id,theme_id,name,description,design_type,preset_id,version,config").order("design_type").order("created_at"),
      supabase.from("broadcast_design_assets").select("*").eq("organization_id", member.organization_id).order("created_at"),
      supabase.from("broadcast_themes").select("id,name,theme_type,preset_id").order("theme_type").order("name"),
      supabase.from("tournaments").select("id,name,design_id,theme_id").eq("organization_id", member.organization_id).order("created_at", { ascending: false }),
    ]);

    if (designResult.error) setError(designResult.error.message);
    if (assetResult.error) setError(assetResult.error.message);
    if (themeResult.error) setError(themeResult.error.message);
    if (tournamentResult.error) setError(tournamentResult.error.message);

    const nextDesigns = (designResult.data ?? []) as BroadcastDesignRecord[];
    setDesigns(nextDesigns);
    setAssets((assetResult.data ?? []) as BroadcastDesignAsset[]);
    setThemes((themeResult.data ?? []) as ThemeOption[]);
    setTournaments((tournamentResult.data ?? []) as Tournament[]);

    if (!selectedId && nextDesigns[0]) selectDesign(nextDesigns[0], tournamentResult.data ?? [], assetResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const systemDesigns = useMemo(() => designs.filter(item => item.design_type === "SYSTEM"), [designs]);
  const customDesigns = useMemo(() => designs.filter(item => item.design_type === "CUSTOM"), [designs]);
  const selectedAssets = useMemo(() => assets.filter(item => item.design_id === selectedId), [assets, selectedId]);
  const stageAsset = selectedAssets.find(item => item.slot === stageBackgroundSlot(stage));
  const currentStagePolicy = draft.stageDefaults[stage] ?? { background: "FULL", panel: "CLEAN" };

  function selectDesign(design: BroadcastDesignRecord, tournamentRows = tournaments, assetRows = assets) {
    setSelectedId(design.id);
    setDraft(normalizeDesign(design.config));
    setDraftName(design.name);
    setDraftDescription(design.description ?? "");
    setThemeId(design.theme_id ?? "");
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
    setThemeId(themes.find(item => item.theme_type === "SYSTEM")?.id ?? "");
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
    setThemeId(selected.theme_id ?? themes.find(item => item.theme_type === "SYSTEM")?.id ?? "");
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
      theme_id: themeId || null,
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
        theme_id: themeId || null,
        name: payload.name,
        description: payload.description,
        design_type: "CUSTOM",
        config: payload.config,
        created_by: userId,
      }).select("id,organization_id,theme_id,name,description,design_type,preset_id,version,config").single();

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
      theme_id: themeId || null,
    }).eq("id", assignment);
    if (updateError) setError(updateError.message);
    else {
      setTournaments(current => current.map(item => item.id === assignment ? { ...item, design_id: selectedId, theme_id: themeId || null } : item));
      setMessage("Design synced to the tournament. The broadcast overlay will resolve its linked visual theme.");
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
            <div className={styles.preview}>
              {stageAsset?.config?.publicUrl && currentStagePolicy.background === "FULL" && stageAsset.mime_type?.startsWith("video/") && (
                <video className={styles.previewMedia} src={String(stageAsset.config.publicUrl)} autoPlay muted loop playsInline />
              )}
              {stageAsset?.config?.publicUrl && currentStagePolicy.background === "FULL" && stageAsset.mime_type?.startsWith("image/") && (
                <img className={styles.previewMedia} src={String(stageAsset.config.publicUrl)} alt="" />
              )}
              <div className={styles.previewShade} />
              <div className={styles.previewBrand}><span>✦</span><strong>{draftName.toUpperCase()}</strong><small>{stageLabels[stage]}</small></div>
              <div className={styles.previewCenter}>
                <span>MATCH {stage === "MATCH_LIVE" || stage === "MATCH_REVIEW" ? "LIVE" : "01"}</span>
                <h3>{draft.layout.style}</h3>
                <p>{currentStagePolicy.background === "TRANSPARENT" ? "GAMEPLAY-SAFE TRANSPARENT CANVAS" : "FULL-SCENE DESIGN CANVAS"}</p>
                <div className={styles.previewRows}><i /><i /><i /><i /></div>
              </div>
              <div className={styles.previewFooter}><span>{draft.animations.entry.type.replaceAll("_", " ")}</span><span>{draft.animations.stage.durationMs}ms stage motion</span><span>{draft.layout.density} DENSITY</span></div>
            </div>
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
              <label className="field"><span>Base visual theme</span><select value={themeId} onChange={e => setThemeId(e.target.value)} disabled={isSystem || !canEdit}><option value="">No theme</option>{themes.map(item => <option key={item.id} value={item.id}>{item.name}{item.theme_type === "SYSTEM" ? " · system" : ""}</option>)}</select></label>
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
              <span className="status-pill">DESIGN → THEME → OVERLAY</span>
            </div>
            <p className="muted">A tournament stores the selected design and linked theme. The live browser source can resolve the same visual package without a second manual OBS selection.</p>
            <div className="form-grid two">
              <label className="field"><span>Tournament</span><select value={assignment} onChange={e => setAssignment(e.target.value)} disabled={!selectedId || saving}><option value="">Choose tournament…</option>{tournaments.map(item => <option key={item.id} value={item.id}>{item.name}{item.design_id === selectedId ? " · current" : ""}</option>)}</select></label>
              <div className="field"><span>Linked theme</span><div className="readonly-control">{themes.find(item => item.id === themeId)?.name ?? "No theme selected"}</div></div>
            </div>
            <div className={styles.actions}><button className="primary-button" onClick={() => void assignDesign()} disabled={!selectedId || !assignment || saving}>Assign design</button><button className="ghost-button" onClick={() => void clearAssignment()} disabled={!assignment || saving}>Clear</button></div>
          </div>
        </section>
      </section>
    </main>
  );
}
