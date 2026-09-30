"use client";

import type { CSSProperties } from "react";

export type BroadcastStage =
  | "ROSTER_1"
  | "ROSTER_2"
  | "ROOM"
  | "MATCH_LIVE"
  | "MATCH_REVIEW"
  | "MATCH_VERIFIED"
  | "MATCH_PT"
  | "OVERALL"
  | "THANK_YOU";

export interface BroadcastThemeConfig {
  version: number;
  branding: { label: string; mark: string };
  colors: {
    primary: string; secondary: string; accent: string; background: string;
    panel: string; panelStrong: string; text: string; muted: string; border: string;
  };
  typography: { heading: string; body: string; weight: number; tracking: string };
  shape: { radius: string; border: string; shadow: string; clip: string };
  effects: { glow: string; transition: string };
  canvas: { backgroundMode: "transparent" | "gradient" | "solid"; backgroundColor: string; backgroundImage: string | null };
  stages: Record<string, { backgroundMode?: "transparent" | "gradient" | "solid"; panelOpacity?: string }>;
}

export interface BroadcastThemeRecord {
  id: string;
  organization_id: string | null;
  name: string;
  theme_type: "SYSTEM" | "CUSTOM";
  preset_id: string | null;
  config: BroadcastThemeConfig;
  assets?: Record<string, unknown>;
}

export const DEFAULT_THEME_CONFIG: BroadcastThemeConfig = {
  version: 1,
  branding: { label: "OFFICIAL TOURNAMENT BROADCAST", mark: "BA" },
  colors: {
    primary: "#e2b35b", secondary: "#9b6a2e", accent: "#ffe4a1",
    background: "#0b080e", panel: "rgba(25,13,31,.90)", panelStrong: "rgba(11,8,14,.96)",
    text: "#fff7e7", muted: "#b4a6b8", border: "rgba(226,179,91,.34)",
  },
  typography: {
    heading: "Arial, Helvetica, sans-serif", body: "Arial, Helvetica, sans-serif",
    weight: 1000, tracking: ".12em",
  },
  shape: {
    radius: "4px", border: "1px",
    shadow: "0 20px 55px rgba(0,0,0,.36)",
    clip: "polygon(0 0,97% 0,100% 16%,100% 100%,3% 100%,0 84%)",
  },
  effects: {
    glow: "0 0 24px rgba(226,179,91,.22)",
    transition: "linear-gradient(90deg,transparent,#e2b35b,transparent)",
  },
  canvas: { backgroundMode: "transparent", backgroundColor: "transparent", backgroundImage: null },
  stages: {
    ROSTER_1: { backgroundMode: "gradient", panelOpacity: ".90" },
    ROSTER_2: { backgroundMode: "gradient", panelOpacity: ".90" },
    ROOM: { backgroundMode: "gradient", panelOpacity: ".78" },
    MATCH_LIVE: { backgroundMode: "transparent", panelOpacity: ".78" },
    MATCH_REVIEW: { backgroundMode: "transparent", panelOpacity: ".78" },
    MATCH_VERIFIED: { backgroundMode: "gradient", panelOpacity: ".92" },
    MATCH_PT: { backgroundMode: "gradient", panelOpacity: ".92" },
    OVERALL: { backgroundMode: "gradient", panelOpacity: ".92" },
    THANK_YOU: { backgroundMode: "gradient", panelOpacity: ".90" },
  },
};

export function normalizeTheme(input?: Partial<BroadcastThemeConfig> | null): BroadcastThemeConfig {
  const source = input ?? {};
  return {
    ...DEFAULT_THEME_CONFIG,
    ...source,
    branding: { ...DEFAULT_THEME_CONFIG.branding, ...(source.branding ?? {}) },
    colors: { ...DEFAULT_THEME_CONFIG.colors, ...(source.colors ?? {}) },
    typography: { ...DEFAULT_THEME_CONFIG.typography, ...(source.typography ?? {}) },
    shape: { ...DEFAULT_THEME_CONFIG.shape, ...(source.shape ?? {}) },
    effects: { ...DEFAULT_THEME_CONFIG.effects, ...(source.effects ?? {}) },
    canvas: { ...DEFAULT_THEME_CONFIG.canvas, ...(source.canvas ?? {}) },
    stages: { ...DEFAULT_THEME_CONFIG.stages, ...(source.stages ?? {}) },
  };
}

export function themeCssVariables(themeInput?: Partial<BroadcastThemeConfig> | null, stage: BroadcastStage = "ROSTER_1"): CSSProperties {
  const theme = normalizeTheme(themeInput);
  const stageConfig = theme.stages[stage] ?? {};
  const mode = stageConfig.backgroundMode ?? theme.canvas.backgroundMode;
  const stageBackground =
    mode === "transparent"
      ? "transparent"
      : mode === "solid"
        ? theme.canvas.backgroundColor
        : `radial-gradient(circle at 52% 20%, color-mix(in srgb, ${theme.colors.primary} 18%, transparent), transparent 30%), radial-gradient(circle at 12% 88%, color-mix(in srgb, ${theme.colors.secondary} 18%, transparent), transparent 34%), linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.panelStrong} 48%, ${theme.colors.background} 100%)`;

  return {
    "--ff-gold": theme.colors.primary,
    "--ff-gold-hi": theme.colors.accent,
    "--ff-gold-deep": theme.colors.secondary,
    "--ff-plum": theme.colors.panel,
    "--ff-purple": theme.colors.primary,
    "--ff-ink": theme.colors.background,
    "--ff-paper": theme.colors.text,
    "--ff-muted": theme.colors.muted,
    "--theme-primary": theme.colors.primary,
    "--theme-secondary": theme.colors.secondary,
    "--theme-accent": theme.colors.accent,
    "--theme-background": theme.colors.background,
    "--theme-panel": theme.colors.panel,
    "--theme-panel-strong": theme.colors.panelStrong,
    "--theme-text": theme.colors.text,
    "--theme-muted": theme.colors.muted,
    "--theme-border": theme.colors.border,
    "--theme-glow": theme.effects.glow,
    "--theme-shadow": theme.shape.shadow,
    "--theme-radius": theme.shape.radius,
    "--theme-border-width": theme.shape.border,
    "--theme-clip": theme.shape.clip,
    "--theme-heading-font": theme.typography.heading,
    "--theme-body-font": theme.typography.body,
    "--theme-heading-weight": String(theme.typography.weight),
    "--theme-tracking": theme.typography.tracking,
    "--theme-stage-background": stageBackground,
    "--theme-panel-opacity": stageConfig.panelOpacity ?? ".90",
  } as CSSProperties;
}

export function cloneTheme(theme: BroadcastThemeConfig): BroadcastThemeConfig {
  return JSON.parse(JSON.stringify(normalizeTheme(theme))) as BroadcastThemeConfig;
}
