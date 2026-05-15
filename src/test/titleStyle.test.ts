import { describe, expect, it } from "vitest";
import { DEFAULT_TITLE } from "../presets";
import { contrastColorForRgb, parseHexColor, resolveTitleColor, titleAlpha } from "../lib/titleStyle";

describe("title style helpers", () => {
  it("resolves explicit title colors", () => {
    expect(resolveTitleColor({ ...DEFAULT_TITLE, colorMode: "white" })).toBe("#f7f8f5");
    expect(resolveTitleColor({ ...DEFAULT_TITLE, colorMode: "black" })).toBe("#080a0d");
    expect(resolveTitleColor({ ...DEFAULT_TITLE, colorMode: "custom", customColor: "#44ccff" })).toBe("#44ccff");
  });

  it("falls back to white for invalid custom colors", () => {
    expect(resolveTitleColor({ ...DEFAULT_TITLE, colorMode: "custom", customColor: "cyan" })).toBe("#f7f8f5");
  });

  it("chooses contrast colors from sampled background", () => {
    expect(contrastColorForRgb([235, 240, 238])).toBe("#080a0d");
    expect(contrastColorForRgb([12, 16, 22])).toBe("#f7f8f5");
  });

  it("parses hex colors for canvas math", () => {
    expect(parseHexColor("#44ccff")).toEqual([68, 204, 255]);
    expect(parseHexColor("#fff")).toEqual([255, 255, 255]);
    expect(parseHexColor("bad")).toBeNull();
  });

  it("allows opacity to reach zero", () => {
    expect(titleAlpha({ ...DEFAULT_TITLE, opacity: 0 })).toBe(0);
    expect(titleAlpha({ ...DEFAULT_TITLE, opacity: 0.5 })).toBe(0.5);
    expect(titleAlpha({ ...DEFAULT_TITLE, opacity: 2 })).toBe(1);
  });
});
