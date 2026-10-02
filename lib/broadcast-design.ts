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
  typography: { headingWeight: number; bodyWeight: number; tracking: string };
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

export const SYSTEM_DESIGN_PRESETS = [
  {
    presetId: "angular-arena",
    name: "Angular Arena",
    description: "Sharp esports geometry with high-energy motion and strong HUD framing.",
    style: "ANGULAR",
    density: "HIGH",
    safeMargin: 48,
    headingWeight: 900,
    bodyWeight: 600,
    tracking: ".08em",
  },
  {
    presetId: "championship-cinematic",
    name: "Championship Cinematic",
    description: "Premium championship presentation with cinematic pacing and large type.",
    style: "CINEMATIC",
    density: "MEDIUM",
    safeMargin: 56,
    headingWeight: 800,
    bodyWeight: 500,
    tracking: ".14em",
  },
  {
    presetId: "future-grid",
    name: "Future Grid",
    description: "Technology-led broadcast language with modular HUD panels and digital motion.",
    style: "GRID",
    density: "HIGH",
    safeMargin: 40,
    headingWeight: 900,
    bodyWeight: 600,
    tracking: ".10em",
  },
  {
    presetId: "minimal-broadcast",
    name: "Minimal Broadcast",
    description: "Clean information-first package with restrained motion and transparent gameplay presentation.",
    style: "MINIMAL",
    density: "LOW",
    safeMargin: 64,
    headingWeight: 750,
    bodyWeight: 500,
    tracking: ".05em",
  },
] as const;

export const ANIMATION_TYPES = [
  "NONE","FADE","FADE_UP","SLIDE_LEFT","SLIDE_RIGHT","SLIDE_UP","SLIDE_DOWN",
  "SCALE","REVEAL","WIPE","CLIP","SCAN_REVEAL","GLITCH_OUT","DATA_IN","DIGITAL_WIPE",
] as const;

export const DEFAULT_DESIGN_CONFIG: BroadcastDesignConfig = {
  version: 1,
  layout: { style: "MINIMAL", density: "MEDIUM", safeMargin: 48 },
  typography: { headingWeight: 800, bodyWeight: 500, tracking: ".07em" },
  animations: {
    entry: { type: "FADE", durationMs: 360, delayMs: 0, easing: "ease-out" },
    exit: { type: "FADE", durationMs: 260, delayMs: 0, easing: "ease-in" },
    row: { type: "SLIDE_UP", durationMs: 280, staggerMs: 45, easing: "ease-out" },
    stage: { type: "FADE", durationMs: 420, delayMs: 0, easing: "ease-in-out" },
  },
  stageDefaults: Object.fromEntries(
    DESIGN_STAGES.map(stage => [
      stage,
      { background: stage === "MATCH_LIVE" ? "TRANSPARENT" : "FULL", panel: stage === "MATCH_LIVE" ? "HUD" : "CLEAN" },
    ]),
  ),
  assetSlots: ASSET_SLOTS.map(item => item.slot),
};

export function normalizeDesign(input?: Partial<BroadcastDesignConfig> | null): BroadcastDesignConfig {
  const source = input ?? {};
  const animations: Partial<BroadcastDesignConfig["animations"]> = source.animations ?? {};
  return {
    ...DEFAULT_DESIGN_CONFIG,
    ...source,
    layout: { ...DEFAULT_DESIGN_CONFIG.layout, ...(source.layout ?? {}) },
    typography: { ...DEFAULT_DESIGN_CONFIG.typography, ...(source.typography ?? {}) },
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

export function designCssVariables(
  input?: Partial<BroadcastDesignConfig> | null,
  stage: string = "ROSTER_1",
): CSSProperties {
  const design = normalizeDesign(input);
  const palettes: Record<string, {
    primary: string; secondary: string; accent: string; background: string; panel: string;
    text: string; muted: string; border: string; radius: string; clip: string; shadow: string;
    heading: string; body: string; weight: number; tracking: string;
  }> = {
    ANGULAR: {
      primary: "#7c5cff", secondary: "#16d9ff", accent: "#ffffff", background: "#070a12",
      panel: "rgba(10,14,24,.90)", text: "#f7f8ff", muted: "#9aa5bc", border: "rgba(124,92,255,.34)",
      radius: "6px", clip: "polygon(0 0,97% 0,100% 16%,100% 100%,3% 100%,0 84%)",
      shadow: "0 18px 45px rgba(0,0,0,.30)", heading: "Arial, Helvetica, sans-serif",
      body: "Arial, Helvetica, sans-serif", weight: 900, tracking: ".09em",
    },
    CINEMATIC: {
      primary: "#e2b35b", secondary: "#8f5d32", accent: "#ffe6ad", background: "#0c0910",
      panel: "rgba(25,16,28,.90)", text: "#fff7e7", muted: "#b4a6b8", border: "rgba(226,179,91,.34)",
      radius: "4px", clip: "none", shadow: "0 20px 55px rgba(0,0,0,.36)", heading: "Georgia, serif",
      body: "Arial, Helvetica, sans-serif", weight: 700, tracking: ".12em",
    },
    GRID: {
      primary: "#00d9ff", secondary: "#6366f1", accent: "#e8fbff", background: "#050912",
      panel: "rgba(7,15,29,.88)", text: "#effbff", muted: "#8fa6bd", border: "rgba(0,217,255,.30)",
      radius: "2px", clip: "none", shadow: "0 16px 42px rgba(0,0,0,.34)", heading: "Arial, Helvetica, sans-serif",
      body: "ui-monospace, SFMono-Regular, Consolas, monospace", weight: 800, tracking: ".08em",
    },
    MINIMAL: {
      primary: "#2563eb", secondary: "#14b8a6", accent: "#ffffff", background: "#08111f",
      panel: "rgba(10,22,39,.84)", text: "#f8fafc", muted: "#94a3b8", border: "rgba(37,99,235,.30)",
      radius: "12px", clip: "none", shadow: "0 16px 42px rgba(0,0,0,.24)", heading: "Arial, Helvetica, sans-serif",
      body: "Arial, Helvetica, sans-serif", weight: 800, tracking: ".07em",
    },
  };
  const palette = palettes[design.layout.style] ?? palettes.MINIMAL;
  const stagePolicy = design.stageDefaults[stage];
  const stageBackground = stagePolicy?.background === "TRANSPARENT"
    ? "transparent"
    : `radial-gradient(circle at 52% 20%, color-mix(in srgb, ${palette.primary} 18%, transparent), transparent 30%), radial-gradient(circle at 12% 88%, color-mix(in srgb, ${palette.secondary} 18%, transparent), transparent 34%), linear-gradient(135deg, ${palette.background} 0%, ${palette.panel} 48%, ${palette.background} 100%)`;
  return {
    "--design-safe-margin": `${design.layout.safeMargin}px`,
    "--design-stage-duration": `${design.animations.stage.durationMs}ms`,
    "--design-entry-duration": `${design.animations.entry.durationMs}ms`,
    "--design-row-duration": `${design.animations.row.durationMs}ms`,
    "--ff-gold": palette.primary,
    "--ff-gold-hi": palette.accent,
    "--ff-gold-deep": palette.secondary,
    "--ff-paper": palette.text,
    "--theme-primary": palette.primary,
    "--theme-secondary": palette.secondary,
    "--theme-accent": palette.accent,
    "--theme-background": palette.background,
    "--theme-panel": palette.panel,
    "--theme-text": palette.text,
    "--theme-muted": palette.muted,
    "--theme-border": palette.border,
    "--theme-radius": palette.radius,
    "--theme-clip": palette.clip,
    "--theme-shadow": palette.shadow,
    "--theme-heading-font": palette.heading,
    "--theme-body-font": palette.body,
    "--theme-heading-weight": String(design.typography.headingWeight || palette.weight),
    "--theme-body-weight": String(design.typography.bodyWeight || 500),
    "--theme-tracking": design.typography.tracking || palette.tracking,
    "--theme-stage-background": stageBackground,
  } as CSSProperties;
}
