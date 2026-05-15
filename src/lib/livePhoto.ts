import { createZip } from "./zip";

export type LivePhotoClassificationKind = "image" | "live-pair" | "video-only" | "unsupported";

export interface LivePhotoClassification {
  kind: LivePhotoClassificationKind;
  imageFile: File | null;
  videoFile: File | null;
}

export interface PackageLivpInput {
  still: Blob & { name?: string };
  motion: Blob & { name?: string };
  stillName?: string;
  motionName?: string;
  title?: string;
  sourceKind: string;
  sourceVideoName?: string;
}

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
const VIDEO_EXTENSIONS = new Set(["mov", "mp4", "m4v", "webm"]);

function extension(file: File): string {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.at(-1)?.toLowerCase() ?? "" : "";
}

function baseName(file: File): string {
  return file.name.replace(/\.[^.]+$/, "").toLowerCase();
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_EXTENSIONS.has(extension(file));
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || VIDEO_EXTENSIONS.has(extension(file));
}

export function classifyLivePhotoFiles(files: File[]): LivePhotoClassification {
  const images = files.filter(isImageFile);
  const videos = files.filter(isVideoFile);

  for (const imageFile of images) {
    const imageBase = baseName(imageFile);
    const videoFile = videos.find((candidate) => baseName(candidate) === imageBase);

    if (videoFile) {
      return {
        kind: "live-pair",
        imageFile,
        videoFile,
      };
    }
  }

  if (images[0]) {
    return {
      kind: "image",
      imageFile: images[0],
      videoFile: videos[0] ?? null,
    };
  }

  if (videos[0]) {
    return {
      kind: "video-only",
      imageFile: null,
      videoFile: videos[0],
    };
  }

  return {
    kind: "unsupported",
    imageFile: null,
    videoFile: null,
  };
}

export function livePairManifest(state: {
  title?: string;
  stillName: string;
  motionName: string;
  sourceKind: string;
  sourceVideoName?: string;
}): string {
  return JSON.stringify(
    {
      app: "Endfieldize",
      format: "web-live-pair",
      title: state.title ?? "",
      still: state.stillName,
      motion: state.motionName,
      sourceKind: state.sourceKind,
      sourceVideo: state.sourceVideoName ?? null,
      note: "This package is a web-preview live pair. Native iOS Live Photo metadata is not guaranteed.",
    },
    null,
    2,
  );
}

function livpPackageMetadata(state: {
  stillName: string;
  motionName: string;
  title?: string;
  sourceKind: string;
  sourceVideoName?: string;
}): string {
  const metadata: Record<string, string> = {
    app: "Endfieldize",
    format: "experimental-livp",
    title: state.title ?? "",
    still: state.stillName,
    motion: state.motionName,
    sourceKind: state.sourceKind,
    note: "This package is experimental. Native Photos compatibility must be verified on target devices.",
  };

  if (state.sourceVideoName) {
    metadata.sourceVideo = state.sourceVideoName;
  }

  return JSON.stringify(
    metadata,
    null,
    2,
  );
}

export async function packageLivp(input: PackageLivpInput): Promise<Blob> {
  const stillName = input.stillName ?? input.still.name ?? "still.png";
  const motionName = input.motionName ?? input.motion.name ?? "motion.webm";
  const metadata = livpPackageMetadata({
    stillName,
    motionName,
    title: input.title,
    sourceKind: input.sourceKind,
    sourceVideoName: input.sourceVideoName,
  });

  return createZip([
    { name: stillName, data: input.still },
    { name: motionName, data: input.motion },
    { name: "metadata.json", data: metadata },
  ]);
}
