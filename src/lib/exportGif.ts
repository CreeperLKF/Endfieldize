import type { AppState } from "../types";
import { exportStateForGifQuality, gifQualitySettings } from "./exportQuality";
import { frameProgress, videoFramePlan } from "./exportVideo";
import { renderComposition } from "./render";

export interface GifExportOptions {
  image: HTMLImageElement;
  state: AppState;
  onProgress?: (progress: number) => void;
  gifEncoderLoader?: GifEncoderLoader;
}

type GifPalette = number[][];
interface GifEncoderModule {
  GIFEncoder: () => {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: {
        palette?: GifPalette;
        delay?: number;
        repeat?: number;
        dispose?: number;
      },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  };
  quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number, options?: { format?: "rgb444" | "rgb565" }): GifPalette;
  applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: GifPalette, format?: "rgb444" | "rgb565"): Uint8Array;
}
type GifEncoderLoader = () => Promise<GifEncoderModule>;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function defaultGifEncoderLoader(): Promise<GifEncoderModule> {
  return import("gifenc");
}

export async function exportGif({ image, state, onProgress = () => {}, gifEncoderLoader = defaultGifEncoderLoader }: GifExportOptions): Promise<Blob> {
  const exportState = exportStateForGifQuality({
    ...state,
    export: { ...state.export, format: "gif" },
  });
  const settings = gifQualitySettings(exportState.export.quality);
  const canvas = document.createElement("canvas");
  canvas.width = exportState.export.width;
  canvas.height = exportState.export.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas 2D context is unavailable");
  }

  const fps = Math.max(1, Math.round(exportState.motion.fps));
  const plan = videoFramePlan(exportState.motion.durationSeconds, fps);
  const { GIFEncoder, applyPalette, quantize } = await gifEncoderLoader();
  const gif = GIFEncoder();
  let palette: GifPalette | null = null;

  for (let frame = 0; frame < plan.frameCount; frame += 1) {
    const progress = frameProgress(frame, plan.frameCount);
    renderComposition({ canvas, image, state: exportState, frameProgress: progress });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    palette ??= quantize(imageData.data, settings.maxColors, { format: "rgb444" });
    const indexedPixels = applyPalette(imageData.data, palette, "rgb444");
    const frameOptions =
      frame === 0
        ? {
            palette,
            delay: plan.frameDurationMs,
            repeat: 0,
            dispose: -1,
          }
        : {
            delay: plan.frameDurationMs,
            dispose: -1,
          };
    gif.writeFrame(indexedPixels, canvas.width, canvas.height, {
      ...frameOptions,
    });
    onProgress(Math.min(0.98, ((frame + 1) / plan.frameCount) * 0.98));

    if (frame % 4 === 0) {
      await wait(0);
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: "image/gif" });
  onProgress(1);

  return blob;
}

export function downloadGif(blob: Blob, filename = "endfieldize.gif"): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
