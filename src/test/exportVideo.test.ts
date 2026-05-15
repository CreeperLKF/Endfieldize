import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_STATE } from "../presets";
import { exportVideo, isVideoFormatSupported, selectVideoMimeType } from "../lib/exportVideo";

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
});
