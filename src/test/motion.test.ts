import { describe, expect, it } from "vitest";
import { aspectSize, clamp, fitCover, lerp } from "../lib/math";
import { easingValue } from "../lib/easing";

describe("math helpers", () => {
  it("clamps values into range", () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });

  it("interpolates numeric values", () => {
    expect(lerp(1, 1.08, 0.5)).toBeCloseTo(1.04);
  });

  it("computes 16:9 output size from width", () => {
    expect(aspectSize(1920, "16:9")).toEqual({ width: 1920, height: 1080 });
  });

  it("rounds source aspect output height", () => {
    expect(aspectSize(1000, "source", 3, 2)).toEqual({ width: 1000, height: 667 });
  });

  it("cover-fits source into target while preserving aspect", () => {
    const rect = fitCover(4000, 3000, 1920, 1080, 0.5, 0.5, 1);

    expect(rect.width).toBeCloseTo(1920);
    expect(rect.height).toBeCloseTo(1440);
    expect(rect.x).toBeCloseTo(0);
    expect(rect.y).toBeCloseTo(-180);
  });

  it("clamps negative cover overflow to zero", () => {
    const rect = fitCover(1000, 1000, 1000, 1000, 1, 1, 0.5);

    expect(rect.width).toBeCloseTo(500);
    expect(rect.height).toBeCloseTo(500);
    expect(rect.x).toBeCloseTo(0);
    expect(rect.y).toBeCloseTo(0);
  });
});

describe("easing", () => {
  it("returns stable endpoints", () => {
    expect(easingValue("linear", 0)).toBe(0);
    expect(easingValue("linear", 1)).toBe(1);
    expect(easingValue("ease-in-out", 0)).toBe(0);
    expect(easingValue("ease-in-out", 1)).toBe(1);
  });

  it("cinematic easing stays within range", () => {
    expect(easingValue("cinematic", 0.5)).toBeGreaterThan(0);
    expect(easingValue("cinematic", 0.5)).toBeLessThan(1);
  });
});
