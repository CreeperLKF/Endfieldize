import { describe, expect, it } from "vitest";
import { classifyLivePhotoFiles } from "../lib/livePhoto";

describe("live photo file classification", () => {
  it("matches a photo and motion file with the same base name", () => {
    const photo = new File(["photo"], "IMG_0420.JPG", { type: "image/jpeg" });
    const motion = new File(["motion"], "IMG_0420.MOV", { type: "video/quicktime" });

    const result = classifyLivePhotoFiles([motion, photo]);

    expect(result.kind).toBe("live-pair");
    expect(result.imageFile?.name).toBe("IMG_0420.JPG");
    expect(result.videoFile?.name).toBe("IMG_0420.MOV");
  });

  it("accepts a standalone video as a video-only source", () => {
    const motion = new File(["motion"], "scene.mp4", { type: "video/mp4" });

    const result = classifyLivePhotoFiles([motion]);

    expect(result.kind).toBe("video-only");
    expect(result.videoFile?.name).toBe("scene.mp4");
  });

  it("reports unsupported file groups without media", () => {
    const note = new File(["text"], "scene.txt", { type: "text/plain" });

    const result = classifyLivePhotoFiles([note]);

    expect(result.kind).toBe("unsupported");
  });
});
