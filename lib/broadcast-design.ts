"use client";

import type { CSSProperties } from "react";

export const DESIGN_STAGES = [
  "ROSTER_1","ROSTER_2","ROOM","MATCH_LIVE","MATCH_REVIEW",
  "MATCH_VERIFIED","MATCH_PT","OVERALL","THANK_YOU",
] as const;

export type DesignStage = typeof DESIGN_STAGES[number];
export type DesignType = "SYSTEM" | "CUSTOM";

export type AnimationSpec = {
  type: string;
  durationMs: number;
  delayMs?: number;
  staggerMs?: number;
  easing: string;
};

export type BroadcastDesignConfig = {
  version: number;
  layout: { style: string; density: "LOW" | "MEDIUM" | "HIGH"; safeMargin: number };
  animations: {
    entry: AnimationSpec;
    exit: AnimationSpec;
    row: AnimationSpec;
    stage: AnimationSpec;
  };
  stageDefaults: Record<string, { background: "FULL" | "TRANSPARENT"; panel: string }>;
  assetSlots: string[];
};

export type BroadcastDesignRecord = {
  id: string;
  organization_id: string | null;
  theme_id: string | null;
  name: string;
  description: string | null;
  design_type: DesignType;
  preset_id: string | null;
  version: number;
  config: BroadcastDesignConfig;
};

export type BroadcastDesignAsset = {
  id: string;
  design_id: string;
  organization_id: string;
  asset_type: string;
  stage: string | null;
  slot: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  fps: number | null;
  config: Record<string, unknown>;
};

export const ASSET_SLOTS = [
  { slot: "font_primary", label: "Primary font", type: "FONT", accept: ".ttf,.otf,.woff,.woff2" },
  { slot: "font_heading", label: "Heading font", type: "FONT", accept: ".ttf,.otf,.woff,.woff2" },
  { slot: "font_body", label: "Body font", type: "FONT", accept: ".ttf,.otf,.woff,.woff2" },
  { slot: "font_mono", label: "Mono / data font", type: "FONT", accept: ".ttf,.otf,.woff,.woff2" },
  { slot: "logo_broadcast", label: "Broadcast logo", type: "LOGO", accept: "image/png,image/jpeg,image/webp,image/svg+xml" },
  { slot: "logo_sponsor_1", label: "Sponsor logo 01", type: "LOGO", accept: "image/png,image/jpeg,image/webp,image/svg+xml" },
  { slot: "logo_sponsor_2", label: "Sponsor logo 02", type: "LOGO", accept: "image/png,image/jpeg,image/webp,image/svg+xml" },
  { slot: "background_global", label: "Global animated background", type: "BACKGROUND", accept: "video/mp4,video/webm,image/png,image/jpeg,image/webp" },
  { slot: "background_roster", label: "Roster background", type: "BACKGROUND", accept: "video/mp4,video/webm,image/png,image/jpeg,image/webp" },
  { slot: "background_room", label: "Room background", type: "BACKGROUND", accept: "video/mp4,video/webm,image/png,image/jpeg,image/webp" },
  { slot: "background_live", label: "Live-stage background", type: "BACKGROUND", accept: "video/mp4,video/webm,image/png,image/jpeg,image/webp" },
  { slot: "background_result", label: "Result background", type: "BACKGROUND", accept: "video/mp4,video/webm,image/png,image/jpeg,image/webp" },
  { slot: "background_overall", label: "Overall background", type: "BACKGROUND", accept: "video/mp4,video/webm,image/png,image/jpeg,image/webp" },
  { slot: "hud_frame", label: "Live HUD frame", type: "OVERLAY", accept: "image/png,image/webp,image/svg+xml" },
  { slot: "lower_third", label: "Lower third", type: "LOWER_THIRD", accept: "image/png,image/webp,image/svg+xml" },
  { slot: "team_card", label: "Team card", type: "TEAM_CARD", accept: "image/png,image/webp,image/svg+xml" },
  { slot: "player_card", label: "Player card", type: "PLAYER_CARD", accept: "image/png,image/webp,image/svg+xml" },
  { slot: "scoreboard", label: "Scoreboard frame", type: "SCOREBOARD", accept: "image/png,image/webp,image/svg+xml" },
  { slot: "standings", label: "Standings frame", type: "STANDINGS", accept: "image/png,image/webp,image/svg+xml" },
  { slot: "winner", label: "Winner / Booyah graphic", type: "WINNER", accept: "image/png,image/webp,image/svg+xml,video/mp4,video/webm" },
  { slot: "transition_stage", label: "Stage transition / stinger", type: "TRANSITION", accept: "video/mp4,video/webm" },
  { slot: "intro_starting", label: "Starting / opening video", type: "INTRO", accept: "video/mp4,video/webm" },
  { slot: "outro_thank_you", label: "Thank-you / outro video", type: "OUTRO", accept: "video/mp4,video/webm,image/png,image/webp" },
] as const;

export const ANIMATION_TYPES = [
  "NONE","FADE","SLIDE_LEFT","SLIDE_RIGHT","SLIDE_UP","SLIDE_DOWN",
  "SCALE","REVEAL","WIPE","CLIP","SCAN_REVEAL","GLITCH_OUT","DATA_IN","DIGITAL_WIPE",
] as const;

export const DEFAULT_DESIGN_CONFIG: BroadcastDesignConfig = {
  version: 1,
  layout: { style: "MINIMAL", density: "MEDIUM", safeMargin: 48 },
  animations: {
    entry: { type: "FADE", durationMs: 360, delayMs: 0, easing: "ease-out" },
    exit: { type: "FADE", durationMs: 260, delayMs: 0, easing: "ease-in" },
    row: { type: "SLIDE_UP", durationMs: 280, staggerMs: 45, easing: "ease-out" },
    stage: { type: "FADE", durationMs: 420, delayMs: 0, easing: "ease-in-out" },
  },
  stageDefaults: Object.fromEntries(
    DESIGN_STAGES.map(stage => [
      stage,
      { background: stage === "MATCH_LIVE" || stage === "MATCH_REVIEW" ? "TRANSPARENT" : "FULL", panel: stage === "MATCH_LIVE" || stage === "MATCH_REVIEW" ? "HUD" : "CLEAN" },
    ]),
  ),
  assetSlots: ASSET_SLOTS.map(item => item.slot),
};

export function normalizeDesign(input?: Partial<BroadcastDesignConfig> | null): BroadcastDesignConfig {
  const source = input ?? {};
  const animations = source.animations ?? {};
  return {
    ...DEFAULT_DESIGN_CONFIG,
    ...source,
    layout: { ...DEFAULT_DESIGN_CONFIG.layout, ...(source.layout ?? {}) },
    animations: {
      entry: { ...DEFAULT_DESIGN_CONFIG.animations.entry, ...(animations.entry ?? {}) },
      exit: { ...DEFAULT_DESIGN_CONFIG.animations.exit, ...(animations.exit ?? {}) },
      row: { ...DEFAULT_DESIGN_CONFIG.animations.row, ...(animations.row ?? {}) },
      stage: { ...DEFAULT_DESIGN_CONFIG.animations.stage, ...(animations.stage ?? {}) },
    },
    stageDefaults: { ...DEFAULT_DESIGN_CONFIG.stageDefaults, ...(source.stageDefaults ?? {}) },
    assetSlots: source.assetSlots?.length ? [...source.assetSlots] : [...DEFAULT_DESIGN_CONFIG.assetSlots],
  };
}

export function cloneDesignConfig(input?: Partial<BroadcastDesignConfig> | null) {
  return structuredClone(normalizeDesign(input));
}

export function designCssVariables(input?: Partial<BroadcastDesignConfig> | null): CSSProperties {
  const design = normalizeDesign(input);
  return {
    "--design-safe-margin": `${design.layout.safeMargin}px`,
    "--design-stage-duration": `${design.animations.stage.durationMs}ms`,
    "--design-entry-duration": `${design.animations.entry.durationMs}ms`,
    "--design-row-duration": `${design.animations.row.durationMs}ms`,
  } as CSSProperties;
}
