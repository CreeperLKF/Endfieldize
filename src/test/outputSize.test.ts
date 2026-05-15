import { describe, expect, it } from "vitest";
import { outputSizeForAspect } from "../lib/outputSize";

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
});
