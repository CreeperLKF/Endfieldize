import type { AppState, OutputAspect } from "../types";

export const DEFAULT_EXPORT_LONG_EDGE = 1920;
export const DEFAULT_PREVIEW_LONG_EDGE = 1280;

export function evenDimension(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

function safePositive(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function outputSizeForAspect(
  longEdge: number,
  aspect: OutputAspect,
  sourceWidth = 16,
  sourceHeight = 9,
): { width: number; height: number } {
  const safeLongEdge = evenDimension(safePositive(longEdge, DEFAULT_EXPORT_LONG_EDGE));

  if (aspect === "source") {
    const width = safePositive(sourceWidth, 16);
    const height = safePositive(sourceHeight, 9);
    const sourceAspect = width / height;

    if (sourceAspect >= 1) {
      return { width: safeLongEdge, height: evenDimension(safeLongEdge / sourceAspect) };
    }

    return { width: evenDimension(safeLongEdge * sourceAspect), height: safeLongEdge };
  }

  if (aspect === "9:16") {
    return { width: evenDimension(safeLongEdge * (9 / 16)), height: safeLongEdge };
  }

  if (aspect === "1:1") {
    return { width: safeLongEdge, height: safeLongEdge };
  }

  return { width: safeLongEdge, height: evenDimension(safeLongEdge * (9 / 16)) };
}

export function outputSizeForState(state: AppState, longEdge = Math.max(state.export.width, state.export.height)): { width: number; height: number } {
  const source = state.sourceImage ?? state.sourceVideo;

  return outputSizeForAspect(longEdge, state.motion.outputAspect, source?.width, source?.height);
}
