import { describe, expect, it } from "vitest";
import { outputSizeForAspect, stillExportSizeForState } from "../lib/outputSize";
import { DEFAULT_STATE } from "../presets";

describe("output sizing", () => {
  it("preserves arbitrary source aspect within a fixed long edge", () => {
    expect(outputSizeForAspect(1920, "source", 900, 1200)).toEqual({ width: 1440, height: 1920 });
    expect(outputSizeForAspect(1280, "source", 1200, 900)).toEqual({ width: 1280, height: 960 });
  });

  it("keeps fixed aspect outputs on the same long edge", () => {
    expect(outputSizeForAspect(1920, "16:9", 900, 1200)).toEqual({ width: 1920, height: 1080 });
    expect(outputSizeForAspect(1920, "9:16", 900, 1200)).toEqual({ width: 1080, height: 1920 });
    expect(outputSizeForAspect(1920, "1:1", 900, 1200)).toEqual({ width: 1920, height: 1920 });
  });

  it("keeps still exports at the source long edge when the source is larger than the motion export size", () => {
    expect(
      stillExportSizeForState({
        ...DEFAULT_STATE,
        sourceImage: {
          name: "large.jpg",
          url: "blob:large",
          width: 4032,
          height: 3024,
        },
      }),
    ).toEqual({ width: 4032, height: 3024 });

    expect(
      stillExportSizeForState({
        ...DEFAULT_STATE,
        sourceImage: {
          name: "large.jpg",
          url: "blob:large",
          width: 4032,
          height: 3024,
        },
        motion: {
          ...DEFAULT_STATE.motion,
          outputAspect: "16:9",
        },
      }),
    ).toEqual({ width: 4032, height: 2268 });
  });
});
