import { describe, expect, it } from "vitest";
import { applyGradeToImageData, gradePixel, mixRgb } from "../lib/color";
import { DEFAULT_GRADE } from "../presets";

describe("color helpers", () => {
  it("mixes rgb values by amount", () => {
    expect(mixRgb([0, 0, 0], [100, 50, 25], 0.5)).toEqual([50, 25, 13]);
  });

  it("keeps disabled grade unchanged", () => {
    expect(gradePixel([120, 130, 140, 255], { ...DEFAULT_GRADE, enabled: false })).toEqual([120, 130, 140, 255]);
  });

  it("applies a cool wuling grade without exceeding channel bounds", () => {
    const pixel = gradePixel([110, 140, 190, 255], DEFAULT_GRADE);

    expect(pixel[0]).toBeGreaterThanOrEqual(0);
    expect(pixel[1]).toBeGreaterThanOrEqual(0);
    expect(pixel[2]).toBeLessThanOrEqual(255);
    expect(pixel[3]).toBe(255);
  });

  it("default grade creates a stronger cyan cooling shift", () => {
    const input = [150, 160, 150, 255] as const;
    const pixel = gradePixel([...input], DEFAULT_GRADE);

    expect(pixel[0]).toBeLessThan(input[0]);
    expect(pixel[1]).toBeGreaterThanOrEqual(input[1] - 4);
    expect(pixel[2]).toBeGreaterThan(input[2]);
    expect(pixel[2] - pixel[0]).toBeGreaterThan(20);
  });

  it("applies grade to image data in place while preserving alpha", () => {
    const imageData = {
      data: new Uint8ClampedArray([110, 140, 190, 12, 40, 80, 120, 250]),
      width: 2,
      height: 1,
      colorSpace: "srgb",
    } as ImageData;
    const original = [...imageData.data];
    const firstPixel = gradePixel([original[0], original[1], original[2], original[3]], DEFAULT_GRADE);
    const secondPixel = gradePixel([original[4], original[5], original[6], original[7]], DEFAULT_GRADE);

    const result = applyGradeToImageData(imageData, DEFAULT_GRADE);

    expect(result).toBe(imageData);
    expect([...imageData.data.slice(0, 3)]).not.toEqual(original.slice(0, 3));
    expect([...imageData.data.slice(4, 7)]).not.toEqual(original.slice(4, 7));
    expect([...imageData.data.slice(0, 3)]).toEqual(firstPixel.slice(0, 3));
    expect([...imageData.data.slice(4, 7)]).toEqual(secondPixel.slice(0, 3));
    expect(imageData.data[3]).toBe(12);
    expect(imageData.data[7]).toBe(250);
  });
});
