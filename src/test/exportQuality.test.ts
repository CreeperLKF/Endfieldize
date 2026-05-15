import { describe, expect, it } from "vitest";
import {
  exportQualitySettings,
  exportStateForMotionQuality,
  jpegQualityForExport,
  videoBitsPerSecondForExport,
} from "../lib/exportQuality";
import { DEFAULT_STATE } from "../presets";

describe("export quality profiles", () => {
  it("uses high quality as the default app export quality", () => {
    expect(DEFAULT_STATE.export.quality).toBe("high");
  });

  it("maps JPG quality to fixed values", () => {
    expect(jpegQualityForExport("small")).toBe(0.78);
    expect(jpegQualityForExport("standard")).toBe(0.86);
    expect(jpegQualityForExport("high")).toBe(0.94);
  });

  it("maps video bitrate to each quality profile", () => {
    expect(videoBitsPerSecondForExport("small")).toBe(2_000_000);
    expect(videoBitsPerSecondForExport("standard")).toBe(4_000_000);
    expect(videoBitsPerSecondForExport("high")).toBe(12_000_000);
  });

  it("uses 24 fps for all motion export quality profiles", () => {
    expect(exportQualitySettings("small").fps).toBe(24);
    expect(exportQualitySettings("standard").fps).toBe(24);
    expect(exportQualitySettings("high").fps).toBe(24);
  });

  it("creates even scaled dimensions and normalizes exported motion fps to the quality profile", () => {
    const small = exportStateForMotionQuality({
      ...DEFAULT_STATE,
      export: {
        ...DEFAULT_STATE.export,
        width: 1921,
        height: 1081,
        quality: "small",
      },
    });

    expect(small.export.width).toBe(960);
    expect(small.export.height).toBe(540);
    expect(small.motion.fps).toBe(24);

    const high = exportStateForMotionQuality({
      ...DEFAULT_STATE,
      export: {
        ...DEFAULT_STATE.export,
        width: 1920,
        height: 1080,
        quality: "high",
      },
      motion: {
        ...DEFAULT_STATE.motion,
        fps: 60,
      },
    });

    expect(high.export.width).toBe(1920);
    expect(high.export.height).toBe(1080);
    expect(high.motion.fps).toBe(24);
  });
});
