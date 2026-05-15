import type { OutputAspect } from "../types";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export function aspectSize(
  width: number,
  aspect: OutputAspect,
  sourceWidth = width,
  sourceHeight = width,
): { width: number; height: number } {
  if (aspect === "source") {
    return { width, height: Math.round(width * (sourceHeight / sourceWidth)) };
  }

  if (aspect === "9:16") {
    return { width, height: Math.round(width * (16 / 9)) };
  }

  if (aspect === "1:1") {
    return { width, height: width };
  }

  return { width, height: Math.round(width * (9 / 16)) };
}

export function fitCover(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  focusX: number,
  focusY: number,
  scale: number,
): Rect {
  const baseScale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight) * scale;
  const width = sourceWidth * baseScale;
  const height = sourceHeight * baseScale;
  const overflowX = Math.max(0, width - targetWidth);
  const overflowY = Math.max(0, height - targetHeight);
  const x = -overflowX * clamp(focusX, 0, 1);
  const y = -overflowY * clamp(focusY, 0, 1);

  return { x, y, width, height };
}
