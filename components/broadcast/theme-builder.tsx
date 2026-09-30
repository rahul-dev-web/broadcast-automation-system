"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { BroadcastThemePreview } from "@/components/broadcast/theme-preview";
import {
  cloneTheme,
  normalizeTheme,
  type BroadcastStage,
  type BroadcastThemeConfig,
  type BroadcastThemeRecord,
} from "@/lib/broadcast-theme";

const stages: Array<{ id: BroadcastStage; label: string }> = [
  { id: "ROSTER_1", label: "Roster" },
  { id: "ROOM", label: "Room" },
  { id: "MATCH_LIVE", label: "Live HUD" },
  { id: "MATCH_VERIFIED", label: "Result" },
  { id: "MATCH_PT", label: "Match PT" },
  { id: "OVERALL", label: "Overall" },
  { id: "THANK_YOU", label: "Thank You" },
];

const editableColors = [
  ["primary", "Primary"], ["secondary", "Secondary"], ["accent", "Accent"],
  ["background", "Background"], ["panel", "Panel"], ["panelStrong", "Strong panel"],
  ["text", "Text"], ["muted", "Muted"], ["border", "Border"],
] as const;

type Tournament = { id: string; name: string; theme_id: string | null };

export function BroadcastThemeBuilder() {
  const [themes, setThemes] = useState<BroadcastThemeRecord[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<BroadcastThemeConfig>(normalizeTheme());
  const [draftName, setDraftName] = useState("My Broadcast Theme");
  const [stage, setStage] = useState<BroadcastStage>("ROSTER_1");
  const [assignment, setAssignment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canEdit = role === "OWNER" || role === "OPERATOR";
  const selected = themes.find(theme => theme.id === selectedId) ?? null;
  const isSystem = selected?.theme_type === "SYSTEM";

  async function load() {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/auth/login/?next=/broadcast/themes/";
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

    const [{ data: themeRows, error: themeError }, { data: tournamentRows, error: tournamentError }] = await Promise.all([
      supabase.from("broadcast_themes").select("id,organization_id,name,theme_type,preset_id,config,assets").order("theme_type").order("created_at"),
      supabase.from("tournaments").select("id,name,theme_id").eq("organization_id", member.organization_id).order("created_at", { ascending: false }),
    ]);

    if (themeError) setError(themeError.message);
    if (tournamentError) setError(tournamentError.message);

    const nextThemes = (themeRows ?? []) as BroadcastThemeRecord[];
    setThemes(nextThemes);
    setTournaments((tournamentRows ?? []) as Tournament[]);

    if (!selectedId && nextThemes[0]) {
      setSelectedId(nextThemes[0].id);
      setDraft(normalizeTheme(nextThemes[0].config));
      setDraftName(nextThemes[0].name);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!selected) return;
    setDraft(normalizeTheme(selected.config));
    setDraftName(selected.name);
    setAssignment(tournaments.find(t => t.theme_id === selected.id)?.id ?? "");
  }, [selectedId]);

  const systemThemes = useMemo(() => themes.filter(theme => theme.theme_type === "SYSTEM"), [themes]);
  const customThemes = useMemo(() => themes.filter(theme => theme.theme_type === "CUSTOM"), [themes]);

  function selectTheme(theme: BroadcastThemeRecord) {
    setSelectedId(theme.id);
    setDraft(normalizeTheme(theme.config));
    setDraftName(theme.name);
    setAssignment(tournaments.find(t => t.theme_id === theme.id)?.id ?? "");
    setMessage("");
    setError("");
  }

  function updateColor(key: typeof editableColors[number][0], value: string) {
    setDraft(current => ({ ...current, colors: { ...current.colors, [key]: value } }));
  }

  function setStageBackground(value: "transparent" | "gradient" | "solid") {
    setDraft(current => ({
      ...current,
      stages: { ...current.stages, [stage]: { ...current.stages[stage], backgroundMode: value } },
    }));
  }

  function startNew() {
    const base = cloneTheme(systemThemes[0]?.config ?? normalizeTheme());
    setSelectedId("");
    setDraft(base);
    setDraftName("New Custom Theme");
    setAssignment("");
    setMessage("");
    setError("");
  }

  function cloneSelected() {
    const base = cloneTheme(draft);
    setSelectedId("");
    setDraft(base);
    setDraftName(`${selected?.name ?? "Broadcast"} Custom`);
    setAssignment("");
    setMessage("");
    setError("");
  }

  async function saveTheme() {
    if (!organizationId || !canEdit) return;
    setSaving(true); setError(""); setMessage("");
    const payload = { name: draftName.trim() || "Custom Broadcast Theme", config: normalizeTheme(draft), assets: {}, updated_at: new Date().toISOString() };

    if (selected && selected.theme_type === "CUSTOM") {
      const { error: updateError } = await supabase.from("broadcast_themes").update(payload).eq("id", selected.id);
      if (updateError) setError(updateError.message);
      else setMessage("Theme saved.");
    } else {
      const { error: insertError } = await supabase.from("broadcast_themes").insert({
        organization_id: organizationId,
        name: payload.name,
        theme_type: "CUSTOM",
        preset_id: null,
        config: payload.config,
        assets: {},
        created_by: userId,
      });
      if (insertError) setError(insertError.message);
      else {
        setMessage("Custom theme created.");
        await load();
      }
    }
    setSaving(false);
  }

  async function assignTheme() {
    if (!assignment || !selectedId) return;
    setSaving(true); setError(""); setMessage("");
    const { error: updateError } = await supabase.from("tournaments").update({ theme_id: selectedId }).eq("id", assignment);
    if (updateError) setError(updateError.message);
    else {
      setTournaments(current => current.map(t => t.id === assignment ? { ...t, theme_id: selectedId } : t));
      setMessage("Theme assigned to tournament. Its browser-source overlay will use this theme.");
    }
    setSaving(false);
  }

  async function clearAssignment() {
    if (!assignment) return;
    setSaving(true); setError(""); setMessage("");
    const { error: updateError } = await supabase.from("tournaments").update({ theme_id: null }).eq("id", assignment);
    if (updateError) setError(updateError.message);
    else {
      setTournaments(current => current.map(t => t.id === assignment ? { ...t, theme_id: null } : t));
      setMessage("Tournament returned to the default system theme.");
    }
    setSaving(false);
  }

  async function deleteTheme() {
    if (!selected || selected.theme_type !== "CUSTOM") return;
    if (!window.confirm(`Delete "${selected.name}"? Assigned tournaments will fall back to no custom theme.`)) return;
    setSaving(true); setError(""); setMessage("");
    const { error: deleteError } = await supabase.from("broadcast_themes").delete().eq("id", selected.id);
    if (deleteError) setError(deleteError.message);
    else {
      setSelectedId("");
      setMessage("Custom theme deleted.");
      await load();
    }
    setSaving(false);
  }

  if (loading) return <main className="shell"><div className="panel">Loading theme studio…</div></main>;

  return (
    <main className="shell theme-studio">
      <header className="topbar">
        <div>
          <p className="eyebrow">BROADCAST / THEME STUDIO</p>
          <h1>Design the broadcast package</h1>
          <p className="muted">Changes are rendered live in the preview. Gameplay-safe stages keep the canvas transparent where the theme says they should.</p>
        </div>
        <Link className="ghost-button" href="/dashboard/">Back to dashboard</Link>
      </header>

      {message && <div className="success-banner">{message}</div>}
      {error && <div className="error-banner">{error}</div>}

      <section className="theme-studio-layout">
        <aside className="theme-library panel">
          <div className="section-title"><div><p className="eyebrow">SYSTEM PRESETS</p><h2>Start from a package</h2></div><button className="primary-button" onClick={startNew}>New custom</button></div>
          <div className="theme-card-grid">
            {systemThemes.map(theme => (
              <button className={`theme-card ${selectedId === theme.id ? "active" : ""}`} key={theme.id} onClick={() => selectTheme(theme)}>
                <span className="theme-swatch" style={{ background: theme.config.colors.primary }} />
                <strong>{theme.name}</strong><small>SYSTEM PRESET</small>
              </button>
            ))}
          </div>

          <div className="section-title theme-subtitle"><div><p className="eyebrow">YOUR THEMES</p><h2>Custom packages</h2></div></div>
          {customThemes.length === 0 ? <p className="muted">No custom theme yet. Clone a system preset to begin.</p> : (
            <div className="theme-card-grid">
              {customThemes.map(theme => (
                <button className={`theme-card ${selectedId === theme.id ? "active" : ""}`} key={theme.id} onClick={() => selectTheme(theme)}>
                  <span className="theme-swatch" style={{ background: theme.config.colors.primary }} />
                  <strong>{theme.name}</strong><small>CUSTOM</small>
                </button>
              ))}
            </div>
          )}

          <div className="theme-note">
            <strong>Transparent by design</strong>
            <span>Live gameplay HUD stages use transparent canvas space. Panels, standings and player cards stay layered over the gameplay instead of covering it with a full-screen background.</span>
          </div>
        </aside>

        <section className="theme-editor">
          <div className="panel">
            <div className="section-title">
              <div><p className="eyebrow">LIVE PREVIEW</p><h2>{draftName}</h2></div>
              <div className="overlay-controls">{stages.map(item => <button key={item.id} className={`ghost-button small ${stage === item.id ? "active" : ""}`} onClick={() => setStage(item.id)}>{item.label}</button>)}</div>
            </div>
            <div className="theme-preview-frame">
              <BroadcastThemePreview theme={draft} stage={stage} />
            </div>
          </div>

          <div className="panel theme-controls">
            <div className="section-title"><div><p className="eyebrow">CUSTOMIZE</p><h2>Broadcast visual system</h2></div><span className="status-pill">{isSystem ? "SYSTEM · CLONE TO EDIT" : "CUSTOM · EDITABLE"}</span></div>

            <label className="field"><span>Theme name</span><input value={draftName} onChange={e => setDraftName(e.target.value)} disabled={isSystem || !canEdit} /></label>

            <div className="field-group"><div className="field-heading"><strong>Brand colors</strong><span className="muted">Every change updates the preview immediately.</span></div>
              <div className="form-grid three">
                {editableColors.map(([key, label]) => <label className="field" key={key}><span>{label}</span><input type="text" value={draft.colors[key]} onChange={e => updateColor(key, e.target.value)} disabled={isSystem || !canEdit} /></label>)}
              </div>
            </div>

            <div className="field-group"><div className="field-heading"><strong>Typography & shape</strong></div>
              <div className="form-grid three">
                <label className="field"><span>Heading font</span><input value={draft.typography.heading} onChange={e => setDraft(c => ({ ...c, typography: { ...c.typography, heading: e.target.value } }))} disabled={isSystem || !canEdit} /></label>
                <label className="field"><span>Body font</span><input value={draft.typography.body} onChange={e => setDraft(c => ({ ...c, typography: { ...c.typography, body: e.target.value } }))} disabled={isSystem || !canEdit} /></label>
                <label className="field"><span>Radius</span><input value={draft.shape.radius} onChange={e => setDraft(c => ({ ...c, shape: { ...c.shape, radius: e.target.value } }))} disabled={isSystem || !canEdit} /></label>
              </div>
              <div className="form-grid two">
                <label className="field"><span>Panel shadow</span><input value={draft.shape.shadow} onChange={e => setDraft(c => ({ ...c, shape: { ...c.shape, shadow: e.target.value } }))} disabled={isSystem || !canEdit} /></label>
                <label className="field"><span>Angular clip</span><input value={draft.shape.clip} onChange={e => setDraft(c => ({ ...c, shape: { ...c.shape, clip: e.target.value } }))} disabled={isSystem || !canEdit} /></label>
              </div>
            </div>

            <div className="field-group"><div className="field-heading"><strong>Stage background policy</strong><span className="muted">Transparent is recommended for gameplay HUD stages.</span></div>
              <div className="mode-grid">
                {(["transparent", "gradient", "solid"] as const).map(mode => <button key={mode} className={`mode-card ${(draft.stages[stage]?.backgroundMode ?? "gradient") === mode ? "active" : ""}`} onClick={() => setStageBackground(mode)} disabled={isSystem || !canEdit}><strong>{mode}</strong><span>{mode === "transparent" ? "Keep the game/video visible." : mode === "gradient" ? "Use a branded full-scene treatment." : "Use a flat branded canvas."}</span></button>)}
              </div>
            </div>

            <div className="hero-actions">
              {isSystem ? <button className="primary-button" onClick={cloneSelected} disabled={!canEdit}>Clone & customize</button> : <button className="primary-button" onClick={() => void saveTheme()} disabled={!canEdit || saving}>{saving ? "Saving…" : "Save custom theme"}</button>}
              {!isSystem && selected && <button className="ghost-button" onClick={() => void deleteTheme()} disabled={saving}>Delete</button>}
            </div>
          </div>

          <div className="panel theme-assignment">
            <div className="section-title"><div><p className="eyebrow">SYNC TO TOURNAMENT</p><h2>Use this theme in the real overlay</h2></div><span className="status-pill">SUPABASE → OBS</span></div>
            <p className="muted">Choose a tournament and assign the selected theme. The production browser source resolves the same theme configuration from Supabase.</p>
            <div className="form-grid two">
              <label className="field"><span>Tournament</span><select value={assignment} onChange={e => setAssignment(e.target.value)} disabled={!selectedId || saving}><option value="">Choose tournament…</option>{tournaments.map(t => <option key={t.id} value={t.id}>{t.name}{t.theme_id === selectedId ? " · current" : ""}</option>)}</select></label>
              <div className="field"><span>Assignment</span><div className="readonly-control">{assignment ? (tournaments.find(t => t.id === assignment)?.theme_id === selectedId ? "This theme is active" : "Ready to assign") : "Select a tournament"}</div></div>
            </div>
            <div className="hero-actions"><button className="primary-button" onClick={() => void assignTheme()} disabled={!selectedId || !assignment || saving}>Assign theme</button><button className="ghost-button" onClick={() => void clearAssignment()} disabled={!assignment || saving}>Clear assignment</button></div>
          </div>
        </section>
      </section>
    </main>
  );
}
