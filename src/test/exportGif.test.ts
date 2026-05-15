import { describe, expect, it } from "vitest";
import { encodeGifFromIndexedFrames, imageDataToIndexedPixels, indexedColorTable, rgbToIndexedColor } from "../lib/exportGif";

function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
        return;
      }

      reject(new Error("Expected FileReader to return an ArrayBuffer."));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Failed to read blob bytes.")));
    reader.readAsArrayBuffer(blob);
  });
}

describe("gif export encoding", () => {
  it("maps rgb pixels into a stable 256 color table", () => {
    expect(indexedColorTable()).toHaveLength(256 * 3);
    expect(rgbToIndexedColor(255, 0, 0)).toBe(224);
    expect(rgbToIndexedColor(0, 255, 0)).toBe(28);
    expect(rgbToIndexedColor(0, 0, 255)).toBe(3);
  });

  it("keeps non-white pixels during indexed conversion", () => {
    const imageData = {
      data: new Uint8ClampedArray([
        0, 0, 0, 255,
        255, 255, 255, 255,
      ]),
      width: 2,
      height: 1,
      colorSpace: "srgb",
    } as ImageData;

    const pixels = imageDataToIndexedPixels(imageData);

    expect(pixels[0]).not.toBe(255);
    expect(pixels[1]).toBe(255);
  });

  it("encodes indexed animation frames into an image/gif blob", async () => {
    const result = encodeGifFromIndexedFrames({
      width: 2,
      height: 2,
      delayCentiseconds: 10,
      frames: [new Uint8Array([0, 224, 28, 3]), new Uint8Array([3, 28, 224, 0])],
    });

    const bytes = await readBlobBytes(result);
    const header = String.fromCharCode(...bytes.slice(0, 6));

    expect(result.type).toBe("image/gif");
    expect(header).toBe("GIF89a");
    expect(bytes[bytes.length - 1]).toBe(0x3b);
    expect([...bytes].filter((byte) => byte === 0x2c)).toHaveLength(2);
  });

  it("does not request restore-to-background disposal for full frames", async () => {
    const result = encodeGifFromIndexedFrames({
      width: 1,
      height: 1,
      delayCentiseconds: 10,
      frames: [new Uint8Array([0]), new Uint8Array([224])],
    });

    const bytes = await readBlobBytes(result);
    const gceIndex = [...bytes].findIndex((byte, index, source) => byte === 0x21 && source[index + 1] === 0xf9);

    expect(gceIndex).toBeGreaterThanOrEqual(0);
    expect(bytes[gceIndex + 3]).toBe(0x00);
  });
});
