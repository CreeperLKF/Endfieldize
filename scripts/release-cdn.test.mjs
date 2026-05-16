import { describe, expect, it } from "vitest";
import { cdnBaseForVersion, createReleasePlan, normalizeVersion } from "./release-cdn.mjs";

describe("CDN release planning", () => {
  it("normalizes release versions with or without a leading v", () => {
    expect(normalizeVersion("1.2.3")).toBe("1.2.3");
    expect(normalizeVersion("v1.2.3")).toBe("1.2.3");
  });

  it("builds stable jsDelivr base URLs on the cdn branch", () => {
    expect(cdnBaseForVersion("v1.2.3")).toBe("https://cdn.jsdelivr.net/gh/CreeperLKF/Endfieldize@cdn/v1.2.3/");
  });

  it("creates the release directory and build output plan", () => {
    expect(createReleasePlan("v1.2.3")).toMatchObject({
      version: "1.2.3",
      versionTag: "v1.2.3",
      branch: "cdn",
      releaseDir: "v1.2.3",
      buildOutDir: ".cdn-dist/v1.2.3",
    });
  });
});
