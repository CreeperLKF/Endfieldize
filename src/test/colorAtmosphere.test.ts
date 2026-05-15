import { describe, expect, it } from "vitest";
import { atmosphereMask, gradePixel } from "../lib/color";
import { DEFAULT_GRADE } from "../presets";

function chroma(pixel: [number, number, number]): number {
  return Math.max(...pixel) - Math.min(...pixel);
}

describe("atmospheric wuling grade", () => {
  it("weights bright low-saturation distant regions more than saturated foreground regions", () => {
    const grade = {
      ...DEFAULT_GRADE,
      hazeDepth: 0.85,
      hazeFalloff: 0.7,
    };

    const distantSky = atmosphereMask([214, 220, 226], 90, 900, grade);
    const warmForeground = atmosphereMask([184, 86, 48], 720, 900, grade);

    expect(distantSky).toBeGreaterThan(warmForeground);
  });

  it("adds clean cool haze without destroying alpha", () => {
    const grade = {
      ...DEFAULT_GRADE,
      amount: 1,
      hazeDepth: 0.7,
      hazeFalloff: 0.55,
      diffuseLight: 0.3,
      industrialGray: 0.2,
    };

    const pixel = gradePixel([130, 145, 156, 124], grade, {
      y: 100,
      height: 900,
    });

    expect(pixel[2]).toBeGreaterThanOrEqual(pixel[0]);
    expect(pixel[3]).toBe(124);
  });

  it("keeps haze and diffuse from washing out midtone foregrounds", () => {
    const pixel = gradePixel([78, 92, 86, 255], DEFAULT_GRADE, { y: 820, height: 900 });

    expect(pixel[0]).toBeLessThan(95);
    expect(pixel[1]).toBeLessThan(115);
    expect(pixel[2]).toBeLessThan(125);
  });

  it("can reduce chroma through industrial gray finish", () => {
    const grade = {
      ...DEFAULT_GRADE,
      amount: 1,
      industrialGray: 0.75,
      hazeDepth: 0,
      diffuseLight: 0,
    };

    const input: [number, number, number] = [142, 116, 72];
    const output = gradePixel([input[0], input[1], input[2], 255], grade).slice(0, 3) as [number, number, number];

    expect(chroma(output)).toBeLessThan(chroma(input));
  });
});
