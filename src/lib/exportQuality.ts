import type { AppState, ExportQuality } from "../types";
import { evenDimension } from "./outputSize";

export interface ExportQualitySettings {
  scale: number;
  fps: number;
  videoBitsPerSecond: number;
  jpegQuality: number;
}

export interface GifQualitySettings {
  scale: number;
  fps: number;
  maxColors: number;
  maxGrain: number;
}

export const EXPORT_QUALITY_SETTINGS = {
  small: {
    scale: 0.5,
    fps: 24,
    videoBitsPerSecond: 2_000_000,
    jpegQuality: 0.82,
  },
  standard: {
    scale: 0.75,
    fps: 24,
    videoBitsPerSecond: 4_000_000,
    jpegQuality: 0.9,
  },
  high: {
    scale: 1,
    fps: 24,
    videoBitsPerSecond: 12_000_000,
    jpegQuality: 0.98,
  },
} satisfies Record<ExportQuality, ExportQualitySettings>;

export const GIF_QUALITY_SETTINGS = {
  small: {
    scale: 1 / 3,
    fps: 12,
    maxColors: 96,
    maxGrain: 0,
  },
  standard: {
    scale: 5 / 12,
    fps: 12,
    maxColors: 128,
    maxGrain: 0,
  },
  high: {
    scale: 0.5,
    fps: 15,
    maxColors: 192,
    maxGrain: 0,
  },
} satisfies Record<ExportQuality, GifQualitySettings>;

export function exportQualitySettings(quality: ExportQuality): ExportQualitySettings {
  return EXPORT_QUALITY_SETTINGS[quality];
}

export function gifQualitySettings(quality: ExportQuality): GifQualitySettings {
  return GIF_QUALITY_SETTINGS[quality];
}

export function jpegQualityForExport(quality: ExportQuality): number {
  return exportQualitySettings(quality).jpegQuality;
}

export function videoBitsPerSecondForExport(quality: ExportQuality): number {
  return exportQualitySettings(quality).videoBitsPerSecond;
}

export function exportStateForMotionQuality(state: AppState): AppState {
  const settings = exportQualitySettings(state.export.quality);

  return {
    ...state,
    motion: {
      ...state.motion,
      fps: settings.fps,
    },
    export: {
      ...state.export,
      width: evenDimension(state.export.width * settings.scale),
      height: evenDimension(state.export.height * settings.scale),
    },
  };
}

export function exportStateForGifQuality(state: AppState): AppState {
  const settings = gifQualitySettings(state.export.quality);

  return {
    ...state,
    grade: {
      ...state.grade,
      grain: Math.min(state.grade.grain, settings.maxGrain),
    },
    motion: {
      ...state.motion,
      fps: settings.fps,
    },
    export: {
      ...state.export,
      width: evenDimension(state.export.width * settings.scale),
      height: evenDimension(state.export.height * settings.scale),
    },
  };
}
