export type GradePresetName = "default" | "wuling1" | "wuling2" | "wuling3" | "custom";
export type TitlePresetName = "hud-lower-left" | "center-cn" | "center-cn-en" | "sector-top-left" | "lower-right";
export type TitlePosition = "top-left" | "center-left" | "center" | "lower-left" | "lower-right" | "custom";
export type TitleAlignment = "left" | "center" | "right";
export type TitleColorMode = "white" | "black" | "custom" | "contrast";
export type EasingName = "linear" | "ease-in-out" | "cinematic";
export type OutputAspect = "source" | "16:9" | "9:16" | "1:1";
export type ExportFormat = "jpg" | "png" | "mp4" | "gif" | "webm" | "livp";
export type ExportQuality = "small" | "standard" | "high";
export type ExportStatus = "idle" | "rendering" | "done" | "failed";
export type ExportPhase = "idle" | "preparing-still" | "rendering-motion" | "encoding-gif" | "packaging-live-photo" | "downloading" | "done" | "failed";
export type SourceKind = "image" | "live-pair" | "video-only";
export type Language = "zh" | "en";

export interface SourceImageState {
  name: string;
  url: string;
  width: number;
  height: number;
}

export interface SourceVideoState {
  name: string;
  url: string;
  width: number;
  height: number;
  duration: number;
  type: string;
}

export interface GradeState {
  enabled: boolean;
  preset: GradePresetName;
  amount: number;
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  texture: number;
  clarity: number;
  dehaze: number;
  vibrance: number;
  saturation: number;
  cooling: number;
  blueDesaturation: number;
  hazeDepth: number;
  hazeFalloff: number;
  diffuseLight: number;
  industrialGray: number;
  grain: number;
  vignette: number;
}

export interface TitleState {
  enabled: boolean;
  preset: TitlePresetName;
  title: string;
  subtitle: string;
  code: string;
  position: TitlePosition;
  alignment: TitleAlignment;
  colorMode: TitleColorMode;
  customColor: string;
  scale: number;
  tracking: number;
  opacity: number;
  lineWeight: number;
  hudMarks: boolean;
  safeMargin: number;
  offsetX: number;
  offsetY: number;
  shadowStrength: number;
}

export interface MotionState {
  enabled: boolean;
  durationSeconds: number;
  fps: number;
  startScale: number;
  endScale: number;
  focusX: number;
  focusY: number;
  easing: EasingName;
  outputAspect: OutputAspect;
}

export interface ExportState {
  format: ExportFormat;
  quality: ExportQuality;
  width: number;
  height: number;
  progress: number;
  status: ExportStatus;
  phase: ExportPhase;
  error: string;
}

export interface AppState {
  sourceKind: SourceKind;
  sourceImage: SourceImageState | null;
  sourceVideo: SourceVideoState | null;
  language: Language;
  grade: GradeState;
  title: TitleState;
  motion: MotionState;
  export: ExportState;
}
