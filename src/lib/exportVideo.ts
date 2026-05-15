import type { AppState, ExportFormat } from "../types";
import { exportStateForMotionQuality, videoBitsPerSecondForExport } from "./exportQuality";
import { renderComposition } from "./render";

export type VideoExportFormat = Extract<ExportFormat, "mp4" | "webm">;

export interface VideoExportOptions {
  format: VideoExportFormat;
  image: HTMLImageElement;
  state: AppState;
  onProgress: (progress: number) => void;
}

const VIDEO_MIME_CANDIDATES = {
  mp4: ["video/mp4;codecs=h264", "video/mp4"],
  webm: ["video/webm;codecs=vp9", "video/webm"],
} satisfies Record<VideoExportFormat, string[]>;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

function getMediaRecorderConstructor(): typeof MediaRecorder | null {
  if (typeof window !== "undefined" && window.MediaRecorder) {
    return window.MediaRecorder;
  }

  if (typeof MediaRecorder !== "undefined") {
    return MediaRecorder;
  }

  return null;
}

function unsupportedVideoError(format: VideoExportFormat): Error {
  return new Error(`${format.toUpperCase()} video recording is unavailable in this browser`);
}

export function selectVideoMimeType(format: VideoExportFormat): string | null {
  const Recorder = getMediaRecorderConstructor();

  if (!Recorder || typeof Recorder.isTypeSupported !== "function") {
    return null;
  }

  return VIDEO_MIME_CANDIDATES[format].find((type) => Recorder.isTypeSupported(type)) ?? null;
}

export function isVideoFormatSupported(format: VideoExportFormat): boolean {
  return selectVideoMimeType(format) !== null;
}

export async function exportVideo({ format, image, state, onProgress }: VideoExportOptions): Promise<Blob> {
  const exportState = exportStateForMotionQuality(state);
  const canvas = document.createElement("canvas");
  canvas.width = exportState.export.width;
  canvas.height = exportState.export.height;

  if (!canvas.captureStream) {
    throw new Error("Canvas video capture is unavailable in this browser");
  }

  const Recorder = getMediaRecorderConstructor();
  const mimeType = selectVideoMimeType(format);
  if (!Recorder || !mimeType) {
    throw unsupportedVideoError(format);
  }

  const fps = exportState.motion.fps;
  const stream = canvas.captureStream(fps);
  const videoBitsPerSecond = videoBitsPerSecondForExport(exportState.export.quality);
  let recorder: MediaRecorder;

  try {
    recorder = new Recorder(stream, { mimeType, videoBitsPerSecond });
  } catch {
    stopStream(stream);
    throw unsupportedVideoError(format);
  }

  const chunks: BlobPart[] = [];
  let recorderError: Error | null = null;
  const done = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onerror = () => {
      recorderError = new Error("Video export failed");
      reject(recorderError);
    };
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  try {
    recorder.start();

    const totalFrames = Math.max(1, Math.round(exportState.motion.durationSeconds * fps));
    const frameDuration = 1000 / fps;
    const startTime = performance.now();

    for (let frame = 0; frame <= totalFrames; frame += 1) {
      if (recorderError) {
        throw recorderError;
      }

      const progress = frame / totalFrames;
      renderComposition({ canvas, image, state: exportState, frameProgress: progress });
      onProgress(progress);

      const nextFrameTime = startTime + (frame + 1) * frameDuration;
      await wait(Math.max(0, nextFrameTime - performance.now()));
    }

    if (recorder.state !== "inactive") {
      recorder.stop();
    }

    return await done;
  } catch (error) {
    const wasRecording = recorder.state !== "inactive";
    if (wasRecording) {
      recorder.stop();
    }

    if (wasRecording || recorderError) {
      try {
        await done;
      } catch {
        // Preserve the original export error while consuming recorder failures.
      }
    }

    throw error;
  } finally {
    stopStream(stream);
  }
}

export function downloadVideo(blob: Blob, filename = "endfieldize.webm"): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
