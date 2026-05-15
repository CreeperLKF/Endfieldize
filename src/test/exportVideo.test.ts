import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_STATE } from "../presets";
import { exportVideo, frameProgress, isVideoFormatSupported, selectVideoMimeType, videoFramePlan } from "../lib/exportVideo";

class TestMediaRecorder {
  static supportedTypes = new Set<string>();
  static throwOnConstruct = false;

  constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {
    if (TestMediaRecorder.throwOnConstruct) {
      throw new Error("native constructor failed");
    }
  }

  static isTypeSupported(type: string): boolean {
    return TestMediaRecorder.supportedTypes.has(type);
  }
}

const originalCaptureStream = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "captureStream");
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

function stubMinimalCanvasContext(): void {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: vi.fn(() => ({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    })),
  });
}

describe("video export format support", () => {
  beforeEach(() => {
    TestMediaRecorder.supportedTypes = new Set<string>();
    TestMediaRecorder.throwOnConstruct = false;
    vi.stubGlobal("MediaRecorder", TestMediaRecorder);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalCaptureStream) {
      Object.defineProperty(HTMLCanvasElement.prototype, "captureStream", originalCaptureStream);
    } else {
      Reflect.deleteProperty(HTMLCanvasElement.prototype, "captureStream");
    }
    if (originalGetContext) {
      Object.defineProperty(HTMLCanvasElement.prototype, "getContext", originalGetContext);
    } else {
      Reflect.deleteProperty(HTMLCanvasElement.prototype, "getContext");
    }
  });

  it("prefers h264 mp4 when available", () => {
    TestMediaRecorder.supportedTypes = new Set(["video/mp4", "video/mp4;codecs=h264"]);

    expect(selectVideoMimeType("mp4")).toBe("video/mp4;codecs=h264");
    expect(isVideoFormatSupported("mp4")).toBe(true);
  });

  it("falls back to bare mp4", () => {
    TestMediaRecorder.supportedTypes = new Set(["video/mp4"]);

    expect(selectVideoMimeType("mp4")).toBe("video/mp4");
    expect(isVideoFormatSupported("mp4")).toBe(true);
  });

  it("keeps vp9 webm when available", () => {
    TestMediaRecorder.supportedTypes = new Set(["video/webm", "video/webm;codecs=vp9"]);

    expect(selectVideoMimeType("webm")).toBe("video/webm;codecs=vp9");
    expect(isVideoFormatSupported("webm")).toBe(true);
  });

  it("returns null and false when no candidate is supported", () => {
    expect(selectVideoMimeType("mp4")).toBeNull();
    expect(isVideoFormatSupported("mp4")).toBe(false);
    expect(selectVideoMimeType("webm")).toBeNull();
    expect(isVideoFormatSupported("webm")).toBe(false);
  });

  it("returns null and false when MediaRecorder is unavailable", () => {
    vi.stubGlobal("MediaRecorder", undefined);

    expect(selectVideoMimeType("mp4")).toBeNull();
    expect(isVideoFormatSupported("mp4")).toBe(false);
  });

  it("plans exactly the requested duration without an extra terminal frame", () => {
    const plan = videoFramePlan(4, 30);

    expect(plan.frameCount).toBe(120);
    expect(plan.frameDurationMs).toBeCloseTo(1000 / 30);
    expect(plan.durationMs).toBe(4000);
    expect(frameProgress(0, plan.frameCount)).toBe(0);
    expect(frameProgress(119, plan.frameCount)).toBe(1);
  });

  it("normalizes webm recorder constructor failures", async () => {
    TestMediaRecorder.supportedTypes = new Set(["video/webm"]);
    TestMediaRecorder.throwOnConstruct = true;
    const stop = vi.fn();
    Object.defineProperty(HTMLCanvasElement.prototype, "captureStream", {
      configurable: true,
      value: vi.fn(() => ({
        getTracks: () => [{ stop }],
      })),
    });

    await expect(
      exportVideo({
        format: "webm",
        image: {} as HTMLImageElement,
        state: {
          ...DEFAULT_STATE,
          export: {
            ...DEFAULT_STATE.export,
            format: "webm",
          },
        },
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow("WEBM video recording is unavailable in this browser");
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("exports mp4 with lazy Mediabunny loading and explicit planned frame timestamps", async () => {
    stubMinimalCanvasContext();

    const addCalls: Array<[timestamp: number, duration: number]> = [];
    const close = vi.fn();
    const start = vi.fn(async () => {});
    const finalize = vi.fn(async () => {});
    const addVideoTrack = vi.fn();
    const outputBytes = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]);
    const loader = vi.fn(async () => ({
      BufferTarget: class {
        buffer = outputBytes.buffer;
      },
      CanvasSource: class {
        constructor(_canvas: HTMLCanvasElement, _options: unknown) {}

        async add(timestamp: number, duration: number): Promise<void> {
          addCalls.push([timestamp, duration]);
        }

        close(): void {
          close();
        }
      },
      Mp4OutputFormat: class {
        constructor(_options?: unknown) {}
      },
      Output: class {
        target: { buffer: ArrayBuffer };

        constructor(options: { target: { buffer: ArrayBuffer } }) {
          this.target = options.target;
        }

        addVideoTrack(source: unknown, options?: unknown): void {
          addVideoTrack(source, options);
        }

        async start(): Promise<void> {
          await start();
        }

        async finalize(): Promise<void> {
          await finalize();
        }
      },
    }));
    const progress = vi.fn();

    const result = await exportVideo({
      format: "mp4",
      image: { naturalWidth: 2, naturalHeight: 2 } as HTMLImageElement,
      state: {
        ...DEFAULT_STATE,
        grade: { ...DEFAULT_STATE.grade, enabled: false },
        title: { ...DEFAULT_STATE.title, enabled: false },
        motion: { ...DEFAULT_STATE.motion, durationSeconds: 0.125, fps: 24 },
        export: { ...DEFAULT_STATE.export, format: "mp4", width: 2, height: 2 },
      },
      onProgress: progress,
      mediabunnyLoader: loader,
    } as Parameters<typeof exportVideo>[0] & { mediabunnyLoader: typeof loader });

    expect(loader).toHaveBeenCalledTimes(1);
    expect(addVideoTrack).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(finalize).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(result.type).toBe("video/mp4");
    expect(await readBlobBytes(result)).toEqual(outputBytes);
    expect(addCalls).toEqual([
      [0, 1 / 24],
      [1 / 24, 1 / 24],
      [2 / 24, 1 / 24],
    ]);
    expect(progress).toHaveBeenLastCalledWith(1);
  });
});
