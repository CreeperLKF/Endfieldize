import { describe, expect, it } from "vitest";
import { exportPhaseLabels, gradePresetLabels, t, titleColorLabels } from "../i18n";
import type { ExportPhase, GradePresetName, Language, TitleColorMode } from "../types";

const languages: Language[] = ["zh", "en"];
const gradePresets: GradePresetName[] = ["default", "wuling1", "wuling2", "wuling3", "custom"];
const titleColorModes: TitleColorMode[] = ["white", "black", "custom", "contrast"];
const exportPhases: ExportPhase[] = [
  "idle",
  "preparing-still",
  "rendering-motion",
  "encoding-gif",
  "packaging-live-photo",
  "downloading",
  "done",
  "failed",
];

describe("i18n labels", () => {
  it("returns Chinese and English upload labels", () => {
    expect(t("zh", "upload")).toBe("上传");
    expect(t("en", "upload")).toBe("Upload");
    expect(t("zh", "dropImage")).toBe("拖入图片");
    expect(t("en", "dropImage")).toBe("Drop image");
  });

  it("returns Chinese and English landscape recommendation labels", () => {
    expect(t("zh", "landscapeRecommended")).toContain("横屏");
    expect(t("en", "landscapeRecommended")).toContain("landscape");
  });

  it("returns localized livp export failure labels", () => {
    expect(t("zh", "livpExportFailed")).toContain(".livp");
    expect(t("en", "livpExportFailed")).toContain(".livp");
  });

  it("exports complete grade preset labels for both languages", () => {
    for (const language of languages) {
      expect(Object.keys(gradePresetLabels[language])).toEqual(gradePresets);
    }

    expect(gradePresetLabels.zh.default).toBe("默认");
    expect(gradePresetLabels.en.default).toBe("Default");
    expect(gradePresetLabels.zh.wuling2).toBe("武陵 2");
    expect(gradePresetLabels.en.wuling2).toBe("Wuling 2");
    expect(gradePresetLabels.en.custom).toBe("Custom");
  });

  it("exports complete title color labels for both languages", () => {
    for (const language of languages) {
      expect(Object.keys(titleColorLabels[language])).toEqual(titleColorModes);
    }

    expect(titleColorLabels.zh.white).toBe("白色");
    expect(titleColorLabels.en.white).toBe("White");
    expect(titleColorLabels.zh.custom).toBe("自定义颜色");
    expect(titleColorLabels.en.custom).toBe("Custom color");
    expect(titleColorLabels.en.contrast).toBe("Contrast");
  });

  it("exports complete export phase labels for both languages", () => {
    for (const language of languages) {
      expect(Object.keys(exportPhaseLabels[language])).toEqual(exportPhases);
    }

    expect(exportPhaseLabels.zh["preparing-still"]).toBe("正在准备静帧");
    expect(exportPhaseLabels.en["rendering-motion"]).toBe("Rendering motion");
    expect(exportPhaseLabels.zh["encoding-gif"]).toContain("GIF");
    expect(exportPhaseLabels.en["encoding-gif"]).toContain("GIF");
    expect(exportPhaseLabels.zh["packaging-live-photo"]).toContain(".livp");
    expect(exportPhaseLabels.en["packaging-live-photo"]).toContain(".livp");
    expect(exportPhaseLabels.en.failed).toBe("Export failed");
  });
});
