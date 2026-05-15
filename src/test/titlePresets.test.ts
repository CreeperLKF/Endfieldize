import { describe, expect, it } from "vitest";
import { applyTitlePreset, DEFAULT_TITLE, TITLE_PRESET_ORDER, TITLE_PRESETS } from "../presets";
import { getTitleLayout } from "../lib/textLayout";

describe("title presets", () => {
  it("orders bilingual center before Chinese-only center", () => {
    expect(TITLE_PRESET_ORDER).toEqual(["center-cn-en", "center-cn", "hud-lower-left", "sector-top-left", "lower-right"]);
    expect(Object.keys(TITLE_PRESETS)).toEqual(["center-cn", "center-cn-en", "hud-lower-left", "sector-top-left", "lower-right"]);
  });

  it("uses a large centered Chinese-English title by default", () => {
    expect(DEFAULT_TITLE).toMatchObject({
      preset: "center-cn-en",
      title: "武陵",
      subtitle: "WULING CONTROL SECTOR",
      code: "",
      position: "center",
      alignment: "center",
      scale: 1.48,
      tracking: 0.15,
      hudMarks: false,
      shadowStrength: 0.34,
    });

    expect(TITLE_PRESETS["center-cn-en"]).toMatchObject({
      preset: "center-cn-en",
      position: "center",
      alignment: "center",
      scale: 1.48,
      tracking: 0.15,
      hudMarks: false,
      shadowStrength: 0.34,
      code: "",
    });
  });

  it("applies a centered Chinese-English title preset", () => {
    const title = applyTitlePreset({ ...DEFAULT_TITLE, preset: "center-cn", subtitle: "" }, "center-cn-en");

    expect(title.preset).toBe("center-cn-en");
    expect(title.position).toBe("center");
    expect(title.alignment).toBe("center");
    expect(title.subtitle).not.toBe("");
  });

  it("places center titles at the visual center", () => {
    const layout = getTitleLayout(
      {
        ...DEFAULT_TITLE,
        preset: "center-cn-en",
        position: "center",
        alignment: "center",
        scale: 1,
      },
      1920,
      1080,
    );

    expect(layout.align).toBe("center");
    expect(layout.x).toBeCloseTo(960);
    expect(layout.y).toBeGreaterThan(460);
    expect(layout.y).toBeLessThan(620);
  });

  it("preserves title color settings when applying title presets", () => {
    const title = applyTitlePreset(
      {
        ...DEFAULT_TITLE,
        colorMode: "custom",
        customColor: "#44ccff",
        opacity: 0.42,
        shadowStrength: 0.12,
      },
      "center-cn",
    );

    expect(title.colorMode).toBe("custom");
    expect(title.customColor).toBe("#44ccff");
    expect(title.opacity).toBe(0.42);
    expect(title.shadowStrength).toBe(0.12);
  });
});
