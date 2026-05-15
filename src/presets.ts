import type { AppState, GradePresetName, GradeState, MotionState, TitlePresetName, TitleState } from "./types";

export const DEFAULT_GRADE: GradeState = {
  enabled: true,
  preset: "default",
  amount: 0.78,
  exposure: 0.05,
  contrast: 0.25,
  highlights: -0.3,
  shadows: -0.19,
  whites: 0.08,
  blacks: -0.04,
  texture: 0.12,
  clarity: 0.13,
  dehaze: 0.7,
  vibrance: 0.16,
  saturation: 0.04,
  cooling: 0.74,
  blueDesaturation: 0.34,
  hazeDepth: 0.1,
  hazeFalloff: 0.56,
  diffuseLight: 0.13,
  industrialGray: 0.1,
  grain: 0.1,
  vignette: 0.15,
};

const BASE_TITLE: Omit<TitleState, "preset"> = {
  enabled: true,
  title: "武陵",
  subtitle: "WULING CONTROL SECTOR",
  code: "WL-03 / 30.83N 111.00E",
  position: "lower-left",
  alignment: "left",
  colorMode: "white",
  customColor: "#f7f8f5",
  scale: 1,
  tracking: 0,
  opacity: 0.96,
  lineWeight: 1,
  hudMarks: true,
  safeMargin: 0.055,
  offsetX: 0,
  offsetY: 0,
  shadowStrength: 0.34,
};

export const TITLE_PRESET_ORDER: TitlePresetName[] = ["center-cn", "center-cn-en", "hud-lower-left", "sector-top-left", "lower-right"];

export const TITLE_PRESETS: Record<TitlePresetName, TitleState> = {
  "center-cn": {
    ...BASE_TITLE,
    preset: "center-cn",
    subtitle: "",
    code: "",
    position: "center",
    alignment: "center",
    scale: 1.58,
    tracking: 0.04,
    hudMarks: false,
    shadowStrength: 0.34,
  },
  "center-cn-en": {
    ...BASE_TITLE,
    preset: "center-cn-en",
    code: "",
    position: "center",
    alignment: "center",
    scale: 1.48,
    tracking: 0.03,
    hudMarks: false,
    shadowStrength: 0.34,
  },
  "hud-lower-left": {
    ...BASE_TITLE,
    preset: "hud-lower-left",
  },
  "sector-top-left": {
    ...BASE_TITLE,
    preset: "sector-top-left",
    position: "top-left",
    alignment: "left",
    scale: 0.78,
    tracking: 0.04,
    opacity: 0.92,
    hudMarks: true,
    safeMargin: 0.045,
  },
  "lower-right": {
    ...BASE_TITLE,
    preset: "lower-right",
    position: "lower-right",
    alignment: "right",
    scale: 0.95,
    tracking: 0.01,
    hudMarks: true,
  },
};

export const DEFAULT_TITLE: TitleState = TITLE_PRESETS["center-cn"];

export const DEFAULT_MOTION: MotionState = {
  enabled: true,
  durationSeconds: 4,
  fps: 30,
  startScale: 1,
  endScale: 1.08,
  focusX: 0.5,
  focusY: 0.5,
  easing: "ease-in-out",
  outputAspect: "16:9",
};

export const DEFAULT_STATE: AppState = {
  sourceKind: "image",
  sourceImage: null,
  sourceVideo: null,
  language: "zh",
  grade: DEFAULT_GRADE,
  title: DEFAULT_TITLE,
  motion: DEFAULT_MOTION,
  export: {
    format: "mp4",
    quality: "high",
    width: 1920,
    height: 1080,
    progress: 0,
    status: "idle",
    phase: "idle",
    error: "",
  },
};

export const GRADE_PRESET_ORDER: GradePresetName[] = ["default", "wuling1", "wuling2", "wuling3", "custom"];

export const GRADE_PRESETS: Record<Exclude<GradePresetName, "custom">, GradeState> = {
  default: DEFAULT_GRADE,
  wuling1: {
    ...DEFAULT_GRADE,
    preset: "wuling1",
    amount: 0.74,
    cooling: 0.78,
    hazeDepth: 0.08,
    diffuseLight: 0.07,
    industrialGray: 0.05,
    dehaze: 0.68,
    contrast: 0.2,
    clarity: 0.18,
    vibrance: 0.08,
    blueDesaturation: 0.3,
    grain: 0.06,
    vignette: 0.1,
  },
  wuling2: {
    ...DEFAULT_GRADE,
    preset: "wuling2",
    amount: 0.8,
    cooling: 0.88,
    hazeDepth: 0.1,
    diffuseLight: 0.08,
    industrialGray: 0.07,
    dehaze: 0.72,
    contrast: 0.24,
    highlights: -0.34,
    shadows: -0.22,
    vibrance: 0.12,
    blueDesaturation: 0.32,
  },
  wuling3: {
    ...DEFAULT_GRADE,
    preset: "wuling3",
    amount: 0.86,
    cooling: 0.98,
    hazeDepth: 0.12,
    diffuseLight: 0.1,
    industrialGray: 0.09,
    dehaze: 0.78,
    contrast: 0.3,
    highlights: -0.42,
    shadows: -0.28,
    blueDesaturation: 0.34,
    vignette: 0.18,
  },
};

export function markGradeCustom(grade: GradeState): GradeState {
  return { ...grade, preset: "custom" };
}

export function applyTitlePreset(current: TitleState, preset: TitlePresetName): TitleState {
  const next = TITLE_PRESETS[preset];

  return {
    ...next,
    title: current.title,
    subtitle: next.subtitle || current.subtitle,
    code: next.code || current.code,
    colorMode: current.colorMode,
    customColor: current.customColor,
    opacity: current.opacity,
    shadowStrength: current.shadowStrength,
  };
}

export function applyGradePreset(state: AppState, preset: Exclude<GradePresetName, "custom">): AppState {
  return {
    ...state,
    grade: { ...GRADE_PRESETS[preset] },
  };
}
