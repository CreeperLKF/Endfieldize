import type { AppState, MotionState } from "../types";
import { applyGradeToImageData } from "./color";
import { easingValue } from "./easing";
import { fitCover, lerp } from "./math";
import { getTitleLayout } from "./textLayout";
import { contrastColorForRgb, parseHexColor, resolveTitleColor, titleAlpha } from "./titleStyle";

export interface RenderOptions {
  canvas: HTMLCanvasElement;
  image: CanvasImageSource;
  state: AppState;
  frameProgress?: number;
}

type DimensionKey = "naturalWidth" | "naturalHeight" | "videoWidth" | "videoHeight" | "width" | "height";
type TitleLayout = ReturnType<typeof getTitleLayout>;

export function motionScale(motion: MotionState, progress: number): number {
  const eased = easingValue(motion.easing, progress);
  return lerp(motion.startScale, motion.endScale, eased);
}

function readNumberProperty(source: CanvasImageSource, key: DimensionKey): number | null {
  if (typeof source === "object" && source !== null && key in source) {
    const value = (source as unknown as Partial<Record<DimensionKey, unknown>>)[key];
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
  }

  return null;
}

function sourceDimensions(image: CanvasImageSource, fallbackWidth: number, fallbackHeight: number): { width: number; height: number } {
  return {
    width:
      readNumberProperty(image, "naturalWidth") ??
      readNumberProperty(image, "videoWidth") ??
      readNumberProperty(image, "width") ??
      fallbackWidth,
    height:
      readNumberProperty(image, "naturalHeight") ??
      readNumberProperty(image, "videoHeight") ??
      readNumberProperty(image, "height") ??
      fallbackHeight,
  };
}

function sampleAverageRgb(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): [number, number, number] {
  const left = Math.max(0, Math.floor(x));
  const top = Math.max(0, Math.floor(y));
  const sampleWidth = Math.max(1, Math.min(ctx.canvas.width - left, Math.floor(width)));
  const sampleHeight = Math.max(1, Math.min(ctx.canvas.height - top, Math.floor(height)));
  const imageData = ctx.getImageData(left, top, sampleWidth, sampleHeight);
  let red = 0;
  let green = 0;
  let blue = 0;
  const count = imageData.data.length / 4;

  for (let index = 0; index < imageData.data.length; index += 4) {
    red += imageData.data[index];
    green += imageData.data[index + 1];
    blue += imageData.data[index + 2];
  }

  return [Math.round(red / count), Math.round(green / count), Math.round(blue / count)];
}

function titleSampleRect(layout: TitleLayout, width: number, height: number): { x: number; y: number; width: number; height: number } {
  const blockWidth = Math.min(width * 0.45, Math.max(layout.titleSize * 5, 320));
  const blockHeight = layout.titleSize + layout.subtitleSize * 3.4;
  const x = layout.align === "center" ? layout.x - blockWidth / 2 : layout.align === "right" ? layout.x - blockWidth : layout.x;

  return {
    x,
    y: layout.y - layout.titleSize,
    width: blockWidth,
    height: blockHeight,
  };
}

function drawTitleElements(ctx: CanvasRenderingContext2D, state: AppState, layout: TitleLayout, width: number): void {
  const title = state.title;
  const subtitleY = layout.y + layout.subtitleSize * 1.7;
  const codeY = layout.y + layout.subtitleSize * 3.2;
  const tracking = title.tracking * layout.titleSize;

  ctx.font = `800 ${layout.titleSize}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
  drawTrackedText(ctx, title.title, layout.x, layout.y, tracking, layout.align);

  ctx.shadowBlur = 4;
  ctx.font = `700 ${layout.subtitleSize}px "Helvetica Neue", Arial, sans-serif`;
  if (title.subtitle.trim()) {
    drawTrackedText(ctx, title.subtitle.toUpperCase(), layout.x, subtitleY, title.tracking * layout.subtitleSize * 0.6, layout.align);
  }
  ctx.font = `600 ${layout.codeSize}px "Helvetica Neue", Arial, sans-serif`;
  if (title.code.trim()) {
    drawTrackedText(ctx, title.code, layout.x, codeY, title.tracking * layout.codeSize * 0.4, layout.align);
  }

  if (title.hudMarks) {
    const direction = layout.align === "right" ? -1 : 1;
    const markLength = Math.min(width * 0.24, 320);
    const markStart = layout.align === "center" ? layout.x - markLength / 2 : layout.x;
    const markEnd = layout.align === "center" ? layout.x + markLength / 2 : layout.x + direction * markLength;

    ctx.shadowBlur = 0;
    ctx.lineWidth = title.lineWeight;
    ctx.beginPath();
    ctx.moveTo(markStart, layout.y + layout.subtitleSize * 2.15);
    ctx.lineTo(markEnd, layout.y + layout.subtitleSize * 2.15);
    ctx.moveTo(layout.x, layout.y - layout.titleSize * 0.92);
    ctx.lineTo(layout.x, layout.y - layout.titleSize * 1.18);
    ctx.stroke();
  }
}

function drawTitle(ctx: CanvasRenderingContext2D, state: AppState, width: number, height: number): void {
  const title = state.title;
  if (!title.enabled) {
    return;
  }

  const layout = getTitleLayout(title, width, height);
  const sampleRect = titleSampleRect(layout, width, height);
  const sample = sampleAverageRgb(ctx, sampleRect.x, sampleRect.y, sampleRect.width, sampleRect.height);
  const titleColor = resolveTitleColor(title, sample);
  const alpha = titleAlpha(title);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = layout.align;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = titleColor;
  ctx.strokeStyle = titleColor;
  ctx.shadowColor = `rgba(0, 0, 0, ${title.shadowStrength})`;
  ctx.shadowBlur = 10 + title.shadowStrength * 10;
  drawTitleElements(ctx, state, layout, width);

  if (title.colorMode === "contrast") {
    const parsed = parseHexColor(contrastColorForRgb(sample));
    if (parsed) {
      const overlayColor = `rgb(${255 - parsed[0]}, ${255 - parsed[1]}, ${255 - parsed[2]})`;
      ctx.globalAlpha = alpha * 0.18;
      ctx.fillStyle = overlayColor;
      ctx.strokeStyle = overlayColor;
      ctx.shadowColor = `rgba(${255 - parsed[0]}, ${255 - parsed[1]}, ${255 - parsed[2]}, ${Math.min(0.28, title.shadowStrength + 0.08)})`;
      ctx.shadowBlur = 3;
      drawTitleElements(ctx, state, layout, width);
    }
  }

  ctx.restore();
}

function drawTrackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  align: CanvasTextAlign,
): void {
  if (tracking === 0 || text.length <= 1) {
    ctx.fillText(text, x, y);
    return;
  }

  const widths = [...text].map((char) => ctx.measureText(char).width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + tracking * (widths.length - 1);
  let cursor = x;

  if (align === "center") {
    cursor -= totalWidth / 2;
  } else if (align === "right" || align === "end") {
    cursor -= totalWidth;
  }

  ctx.save();
  ctx.textAlign = "left";
  for (const [index, char] of [...text].entries()) {
    ctx.fillText(char, cursor, y);
    cursor += widths[index] + tracking;
  }
  ctx.restore();
}

function drawVignetteAndGrain(ctx: CanvasRenderingContext2D, state: AppState, width: number, height: number): void {
  if (!state.grade.enabled) {
    return;
  }

  if (state.grade.vignette > 0) {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, width * 0.16, width / 2, height / 2, width * 0.74);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, `rgba(0, 0, 0, ${Math.min(0.36, state.grade.vignette * 1.8)})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  if (state.grade.grain > 0) {
    const density = Math.round(width * height * state.grade.grain * 0.0007);
    ctx.fillStyle = "rgba(255, 255, 255, 0.11)";

    for (let index = 0; index < density; index += 1) {
      ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }
  }
}

export function renderComposition({ canvas, image, state, frameProgress = 0 }: RenderOptions): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas 2D context is unavailable");
  }

  const width = canvas.width;
  const height = canvas.height;
  const scale = state.motion.enabled ? motionScale(state.motion, frameProgress) : 1;
  const imageSize = sourceDimensions(image, width, height);
  const rect = fitCover(imageSize.width, imageSize.height, width, height, state.motion.focusX, state.motion.focusY, scale);

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);

  if (state.grade.enabled) {
    const imageData = ctx.getImageData(0, 0, width, height);
    ctx.putImageData(applyGradeToImageData(imageData, state.grade), 0, 0);
  }

  drawVignetteAndGrain(ctx, state, width, height);
  drawTitle(ctx, state, width, height);
}
