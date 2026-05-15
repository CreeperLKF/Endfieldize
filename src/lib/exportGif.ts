import type { AppState } from "../types";
import { exportStateForMotionQuality } from "./exportQuality";
import { renderComposition } from "./render";

export interface GifExportOptions {
  image: HTMLImageElement;
  state: AppState;
  onProgress?: (progress: number) => void;
}

export interface IndexedGifInput {
  width: number;
  height: number;
  delayCentiseconds: number;
  frames: Uint8Array[];
  loopCount?: number;
}

const GIF_COLOR_COUNT = 256;
const GIF_MIN_CODE_SIZE = 8;
const GIF_MAX_CODE = 4096;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function writeString(bytes: number[], value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    bytes.push(value.charCodeAt(index));
  }
}

function writeUint16(bytes: number[], value: number): void {
  bytes.push(value & 0xff, (value >> 8) & 0xff);
}

function writeSubBlocks(bytes: number[], data: Uint8Array): void {
  for (let offset = 0; offset < data.length; offset += 255) {
    const chunk = data.subarray(offset, offset + 255);
    bytes.push(chunk.length, ...chunk);
  }
  bytes.push(0);
}

export function rgbToIndexedColor(red: number, green: number, blue: number): number {
  return (red & 0xe0) | ((green & 0xe0) >> 3) | (blue >> 6);
}

export function indexedColorTable(): Uint8Array {
  const table = new Uint8Array(GIF_COLOR_COUNT * 3);

  for (let index = 0; index < GIF_COLOR_COUNT; index += 1) {
    const red = Math.round(((index >> 5) & 0x07) * (255 / 7));
    const green = Math.round(((index >> 2) & 0x07) * (255 / 7));
    const blue = Math.round((index & 0x03) * (255 / 3));
    const offset = index * 3;

    table[offset] = red;
    table[offset + 1] = green;
    table[offset + 2] = blue;
  }

  return table;
}

export function imageDataToIndexedPixels(imageData: ImageData): Uint8Array {
  const pixels = new Uint8Array(imageData.width * imageData.height);
  const data = imageData.data;

  for (let source = 0, target = 0; source < data.length; source += 4, target += 1) {
    const alpha = data[source + 3] / 255;
    const red = Math.round(data[source] * alpha + 255 * (1 - alpha));
    const green = Math.round(data[source + 1] * alpha + 255 * (1 - alpha));
    const blue = Math.round(data[source + 2] * alpha + 255 * (1 - alpha));

    pixels[target] = rgbToIndexedColor(red, green, blue);
  }

  return pixels;
}

function lzwEncode(indices: Uint8Array): Uint8Array {
  const clearCode = 1 << GIF_MIN_CODE_SIZE;
  const endCode = clearCode + 1;
  const output: number[] = [];
  const dictionary = new Map<string, number>();
  let nextCode = endCode + 1;
  let codeSize = GIF_MIN_CODE_SIZE + 1;
  let bitBuffer = 0;
  let bitCount = 0;

  function resetDictionary(): void {
    dictionary.clear();
    nextCode = endCode + 1;
    codeSize = GIF_MIN_CODE_SIZE + 1;
  }

  function writeCode(code: number): void {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;

    while (bitCount >= 8) {
      output.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  }

  resetDictionary();
  writeCode(clearCode);

  if (indices.length === 0) {
    writeCode(endCode);
  } else {
    let prefix = indices[0];

    for (let index = 1; index < indices.length; index += 1) {
      const suffix = indices[index];
      const dictionaryKey = `${prefix},${suffix}`;
      const dictionaryCode = dictionary.get(dictionaryKey);

      if (dictionaryCode !== undefined) {
        prefix = dictionaryCode;
        continue;
      }

      writeCode(prefix);

      if (nextCode < GIF_MAX_CODE) {
        dictionary.set(dictionaryKey, nextCode);
        nextCode += 1;

        if (nextCode === 1 << codeSize && codeSize < 12) {
          codeSize += 1;
        }
      } else {
        writeCode(clearCode);
        resetDictionary();
      }

      prefix = suffix;
    }

    writeCode(prefix);
    writeCode(endCode);
  }

  if (bitCount > 0) {
    output.push(bitBuffer & 0xff);
  }

  return new Uint8Array(output);
}

export function encodeGifFromIndexedFrames({ width, height, delayCentiseconds, frames, loopCount = 0 }: IndexedGifInput): Blob {
  if (width <= 0 || height <= 0 || frames.length === 0) {
    throw new Error("GIF export failed");
  }

  const expectedFrameSize = width * height;
  for (const frame of frames) {
    if (frame.length !== expectedFrameSize) {
      throw new Error("GIF frame dimensions do not match export size");
    }
  }

  const safeDelay = Math.max(1, Math.min(0xffff, Math.round(delayCentiseconds)));
  const bytes: number[] = [];

  writeString(bytes, "GIF89a");
  writeUint16(bytes, width);
  writeUint16(bytes, height);
  bytes.push(0xf7, 0, 0);
  bytes.push(...indexedColorTable());

  bytes.push(0x21, 0xff, 0x0b);
  writeString(bytes, "NETSCAPE2.0");
  bytes.push(0x03, 0x01);
  writeUint16(bytes, loopCount);
  bytes.push(0);

  for (const frame of frames) {
    bytes.push(0x21, 0xf9, 0x04, 0x00);
    writeUint16(bytes, safeDelay);
    bytes.push(0, 0);

    bytes.push(0x2c);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint16(bytes, width);
    writeUint16(bytes, height);
    bytes.push(0);

    bytes.push(GIF_MIN_CODE_SIZE);
    writeSubBlocks(bytes, lzwEncode(frame));
  }

  bytes.push(0x3b);

  return new Blob([new Uint8Array(bytes)], { type: "image/gif" });
}

export async function exportGif({ image, state, onProgress = () => {} }: GifExportOptions): Promise<Blob> {
  const exportState = exportStateForMotionQuality({
    ...state,
    export: { ...state.export, format: "gif" },
  });
  const canvas = document.createElement("canvas");
  canvas.width = exportState.export.width;
  canvas.height = exportState.export.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas 2D context is unavailable");
  }

  const fps = Math.max(1, Math.round(exportState.motion.fps));
  const totalFrames = Math.max(1, Math.round(exportState.motion.durationSeconds * fps));
  const frames: Uint8Array[] = [];

  for (let frame = 0; frame <= totalFrames; frame += 1) {
    const progress = frame / totalFrames;
    renderComposition({ canvas, image, state: exportState, frameProgress: progress });
    frames.push(imageDataToIndexedPixels(ctx.getImageData(0, 0, canvas.width, canvas.height)));
    onProgress(progress * 0.94);

    if (frame % 4 === 0) {
      await wait(0);
    }
  }

  onProgress(0.97);
  const delayCentiseconds = Math.max(1, Math.round(100 / fps));
  const gif = encodeGifFromIndexedFrames({
    width: canvas.width,
    height: canvas.height,
    delayCentiseconds,
    frames,
  });
  onProgress(1);

  return gif;
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
