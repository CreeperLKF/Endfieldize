import type { AppState } from "../types";
import { renderComposition } from "./render";

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export function renderStillBlob(image: CanvasImageSource, state: AppState, type = "image/png", quality?: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = state.export.width;
  canvas.height = state.export.height;

  renderComposition({ canvas, image, state });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Still export failed"));
        }
      },
      type,
      quality,
    );
  });
}

export function exportStill(image: HTMLImageElement, state: AppState): void {
  const canvas = document.createElement("canvas");
  canvas.width = state.export.width;
  canvas.height = state.export.height;

  renderComposition({ canvas, image, state });

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "endfieldize.png";
  link.click();
}

export default exportStill;
