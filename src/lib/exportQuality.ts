import type { AppState, ExportQuality } from "../types";
import { evenDimension } from "./outputSize";

export interface ExportQualitySettings {
  scale: number;
  fps: number;
  videoBitsPerSecond: number;
  jpegQuality: number;
}

export const EXPORT_QUALITY_SETTINGS = {
  small: {
    scale: 0.5,
    fps: 24,
    videoBitsPerSecond: 2_000_000,
    jpegQuality: 0.78,
  },
  standard: {
    scale: 0.75,
    fps: 24,
    videoBitsPerSecond: 4_000_000,
    jpegQuality: 0.86,
  },
  high: {
    scale: 1,
    fps: 24,
    videoBitsPerSecond: 12_000_000,
    jpegQuality: 0.94,
  },
} satisfies Record<ExportQuality, ExportQualitySettings>;

export function exportQualitySettings(quality: ExportQuality): ExportQualitySettings {
  return EXPORT_QUALITY_SETTINGS[quality];
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
