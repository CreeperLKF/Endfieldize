import { describe, expect, it } from "vitest";
import { packageLivp } from "../lib/livePhoto";

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Expected FileReader to return text."));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Failed to read blob text.")));
    reader.readAsText(blob);
  });
}

describe("live photo livp packaging", () => {
  it("packages still, motion, and metadata into one blob", async () => {
    const still = new File(["still-bytes"], "still.png", { type: "image/png" });
    const motion = new File(["motion-bytes"], "motion.webm", { type: "video/webm" });

    const result = await packageLivp({
      still,
      motion,
      sourceKind: "live-pair",
    });

    const text = await readBlobText(result);

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("application/octet-stream");
    expect(result.size).toBeGreaterThan(0);
    expect(text).toContain("still.png");
    expect(text).toContain("motion.webm");
    expect(text).toContain("metadata.json");
    expect(text).toContain("Endfieldize");
    expect(text).toContain("experimental-livp");
  });

  it("uses explicit still and motion names for unnamed blobs", async () => {
    const still = new Blob(["still-bytes"], { type: "image/png" });
    const motion = new Blob(["motion-bytes"], { type: "video/webm" });

    const result = await packageLivp({
      still,
      motion,
      stillName: "still.png",
      motionName: "motion.webm",
      title: "Rhodes Island",
      sourceKind: "video-only",
      sourceVideoName: "source.mp4",
    });

    const text = await readBlobText(result);

    expect(text).toContain("still.png");
    expect(text).toContain("motion.webm");
    expect(text).toContain("Rhodes Island");
    expect(text).toContain("source.mp4");
    expect(text).not.toContain("\"still\": \"still\"");
    expect(text).not.toContain("\"motion\": \"motion\"");
  });

  it("uses extension-bearing default names for unnamed blobs", async () => {
    const still = new Blob(["still-bytes"], { type: "image/png" });
    const motion = new Blob(["motion-bytes"], { type: "video/webm" });

    const result = await packageLivp({
      still,
      motion,
      sourceKind: "image",
    });

    const text = await readBlobText(result);

    expect(text).toContain("still.png");
    expect(text).toContain("motion.webm");
    expect(text).not.toContain("\"still\": \"still\"");
    expect(text).not.toContain("\"motion\": \"motion\"");
  });
});
