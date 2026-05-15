import { describe, expect, it } from "vitest";
import { cdnBaseForVersion, createReleasePlan, normalizeVersion } from "./release-cdn.mjs";

describe("CDN release planning", () => {
  it("normalizes release versions with or without a leading v", () => {
    expect(normalizeVersion("0.2.0")).toBe("0.2.0");
    expect(normalizeVersion("v0.2.0")).toBe("0.2.0");
  });

  it("builds stable jsDelivr base URLs on the cdn branch", () => {
    expect(cdnBaseForVersion("v0.2.0")).toBe("https://cdn.jsdelivr.net/gh/CreeperLKF/Endfieldize@cdn/v0.2.0/");
  });

  it("creates the release directory and build output plan", () => {
    expect(createReleasePlan("v0.2.0")).toMatchObject({
      version: "0.2.0",
      versionTag: "v0.2.0",
      branch: "cdn",
      releaseDir: "v0.2.0",
      buildOutDir: ".cdn-dist/v0.2.0",
    });
  });
});
