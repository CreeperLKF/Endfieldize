import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_STATE } from "../presets";
import { exportGif } from "../lib/exportGif";

const mocks = vi.hoisted(() => ({
  renderComposition: vi.fn(),
}));

vi.mock("../lib/render", () => ({
  renderComposition: mocks.renderComposition,
}));

const originalGetContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "getContext");

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

describe("gif export", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mocks.renderComposition.mockReset();
    if (originalGetContext) {
      Object.defineProperty(HTMLCanvasElement.prototype, "getContext", originalGetContext);
    } else {
      Reflect.deleteProperty(HTMLCanvasElement.prototype, "getContext");
    }
  });

  it("exports gif with a lazy gifenc loader and the planned frame count", async () => {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: vi.fn(() => ({
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(2 * 2 * 4),
          width: 2,
          height: 2,
          colorSpace: "srgb",
        })),
      })),
    });

    const bytes = new Uint8Array([71, 73, 70, 56, 57, 97, 59]);
    const writeFrame = vi.fn();
    const finish = vi.fn();
    const loader = vi.fn(async () => ({
      GIFEncoder: vi.fn(() => ({
        writeFrame,
        finish,
        bytes: vi.fn(() => bytes),
      })),
      quantize: vi.fn(() => [[0, 0, 0]]),
      applyPalette: vi.fn(() => new Uint8Array(2 * 2)),
    }));
    const progress = vi.fn();

    const result = await exportGif({
      image: { naturalWidth: 2, naturalHeight: 2 } as HTMLImageElement,
      state: {
        ...DEFAULT_STATE,
        grade: { ...DEFAULT_STATE.grade, enabled: false },
        title: { ...DEFAULT_STATE.title, enabled: false },
        motion: { ...DEFAULT_STATE.motion, durationSeconds: 0.125, fps: 24 },
        export: { ...DEFAULT_STATE.export, format: "gif", width: 2, height: 2 },
      },
      onProgress: progress,
      gifEncoderLoader: loader,
    } as Parameters<typeof exportGif>[0] & { gifEncoderLoader: typeof loader });

    expect(loader).toHaveBeenCalledTimes(1);
    expect(writeFrame).toHaveBeenCalledTimes(2);
    expect(writeFrame).toHaveBeenNthCalledWith(1, expect.any(Uint8Array), 2, 2, {
      palette: [[0, 0, 0]],
      delay: 1000 / 15,
      repeat: 0,
      dispose: -1,
    });
    expect(writeFrame).toHaveBeenNthCalledWith(2, expect.any(Uint8Array), 2, 2, {
      delay: 1000 / 15,
      dispose: -1,
    });
    expect(finish).toHaveBeenCalledTimes(1);
    expect(result.type).toBe("image/gif");
    expect(await readBlobBytes(result)).toEqual(bytes);
    expect(progress).toHaveBeenLastCalledWith(1);
  });

  it("caps high quality GIFs to a social-friendly frame size and frame count", async () => {
    const getImageData = vi.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 960,
      height: 540,
      colorSpace: "srgb",
    }));
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: vi.fn(() => ({
        getImageData,
      })),
    });

    const bytes = new Uint8Array([71, 73, 70, 56, 57, 97, 59]);
    const writeFrame = vi.fn();
    const loader = vi.fn(async () => ({
      GIFEncoder: vi.fn(() => ({
        writeFrame,
        finish: vi.fn(),
        bytes: vi.fn(() => bytes),
      })),
      quantize: vi.fn(() => [[0, 0, 0]]),
      applyPalette: vi.fn(() => new Uint8Array(960 * 540)),
    }));

    await exportGif({
      image: { naturalWidth: 1920, naturalHeight: 1080 } as HTMLImageElement,
      state: {
        ...DEFAULT_STATE,
        motion: { ...DEFAULT_STATE.motion, durationSeconds: 4, fps: 24 },
        export: { ...DEFAULT_STATE.export, format: "gif", width: 1920, height: 1080, quality: "high" },
      },
      gifEncoderLoader: loader,
    } as Parameters<typeof exportGif>[0] & { gifEncoderLoader: typeof loader });

    const { quantize } = await loader.mock.results[0].value;
    expect(writeFrame).toHaveBeenCalledTimes(60);
    expect(getImageData).toHaveBeenCalledWith(0, 0, 960, 540);
    expect(quantize).toHaveBeenCalledTimes(1);
    expect(quantize).toHaveBeenCalledWith(expect.any(Uint8ClampedArray), 192, { format: "rgb444" });
    expect(writeFrame).toHaveBeenNthCalledWith(1, expect.any(Uint8Array), 960, 540, {
      palette: [[0, 0, 0]],
      delay: 1000 / 15,
      repeat: 0,
      dispose: -1,
    });
    expect(writeFrame).toHaveBeenNthCalledWith(2, expect.any(Uint8Array), 960, 540, {
      delay: 1000 / 15,
      dispose: -1,
    });
    expect(mocks.renderComposition).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          grade: expect.objectContaining({ grain: 0 }),
          motion: expect.objectContaining({ fps: 15 }),
          export: expect.objectContaining({ width: 960, height: 540 }),
        }),
      }),
    );
  });
});
