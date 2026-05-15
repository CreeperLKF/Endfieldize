import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isVideoFormatSupported, selectVideoMimeType } from "../lib/exportVideo";

class TestMediaRecorder {
  static supportedTypes = new Set<string>();

  static isTypeSupported(type: string): boolean {
    return TestMediaRecorder.supportedTypes.has(type);
  }
}

describe("video export format support", () => {
  beforeEach(() => {
    TestMediaRecorder.supportedTypes = new Set<string>();
    vi.stubGlobal("MediaRecorder", TestMediaRecorder);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
});
