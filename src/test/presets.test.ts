import { describe, expect, it } from "vitest";
import { applyGradePreset, DEFAULT_GRADE, DEFAULT_STATE, GRADE_PRESET_ORDER, GRADE_PRESETS, markGradeCustom } from "../presets";
import type { AppState, ExportState } from "../types";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type IsRequired<T, K extends keyof T> = {} extends Pick<T, K> ? false : true;

type _ExportFormatContract = Expect<Equal<ExportState["format"], "png" | "webm" | "gif" | "livp">>;
type _ExportPhaseRequired = Expect<IsRequired<ExportState, "phase">>;
type _AppLanguageRequired = Expect<IsRequired<AppState, "language">>;

describe("grade presets", () => {
  it("exposes grade presets in UI order", () => {
    expect(GRADE_PRESET_ORDER).toEqual(["default", "wuling1", "wuling2", "wuling3", "custom"]);
    expect(Object.keys(GRADE_PRESETS)).toEqual(["default", "wuling1", "wuling2", "wuling3"]);
  });

  it("uses the provided default grade values", () => {
    expect(DEFAULT_GRADE).toMatchObject({
      preset: "default",
      amount: 0.78,
      cooling: 0.74,
      hazeDepth: 0.1,
      diffuseLight: 0.13,
      industrialGray: 0.1,
      exposure: 0.05,
      contrast: 0.25,
      highlights: -0.3,
      shadows: -0.19,
      whites: 0.08,
      blacks: -0.04,
      texture: 0.12,
      clarity: 0.13,
      dehaze: 0.7,
      vibrance: 0.16,
      saturation: 0.04,
      blueDesaturation: 0.34,
      hazeFalloff: 0.56,
      grain: 0.1,
      vignette: 0.15,
    });
  });

  it("uses a four second default motion duration", () => {
    expect(DEFAULT_STATE.motion.durationSeconds).toBe(4);
  });

  it("applying a grade preset does not overwrite source, title, motion, language, or export settings", () => {
    const state = applyGradePreset(
      {
        ...DEFAULT_STATE,
        language: "en",
        sourceImage: {
          name: "sample.jpg",
          url: "blob:sample",
          width: 1920,
          height: 1080,
        },
        title: {
          ...DEFAULT_STATE.title,
          title: "保留标题",
          colorMode: "custom",
          customColor: "#44ccff",
        },
        motion: {
          ...DEFAULT_STATE.motion,
          durationSeconds: 9,
        },
        export: {
          ...DEFAULT_STATE.export,
          width: 1280,
          phase: "downloading",
        },
      },
      "wuling2",
    );

    expect(state.grade.preset).toBe("wuling2");
    expect(state.sourceImage?.name).toBe("sample.jpg");
    expect(state.title.title).toBe("保留标题");
    expect(state.title.colorMode).toBe("custom");
    expect(state.motion.durationSeconds).toBe(9);
    expect(state.language).toBe("en");
    expect(state.export.width).toBe(1280);
    expect(state.export.phase).toBe("downloading");
  });

  it("marks a grade as custom after slider edits", () => {
    const grade = markGradeCustom({ ...DEFAULT_GRADE, cooling: 0.66 });

    expect(grade.preset).toBe("custom");
    expect(grade.cooling).toBe(0.66);
  });
});
