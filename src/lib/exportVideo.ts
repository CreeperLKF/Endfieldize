import type { AppState, ExportFormat } from "../types";
import { exportStateForMotionQuality, videoBitsPerSecondForExport } from "./exportQuality";
import { renderComposition } from "./render";

export type VideoExportFormat = Extract<ExportFormat, "mp4" | "webm">;
type RecorderVideoExportFormat = Extract<VideoExportFormat, "webm">;

export interface VideoExportOptions {
  format: VideoExportFormat;
  image: HTMLImageElement;
  state: AppState;
  onProgress: (progress: number) => void;
  mediabunnyLoader?: MediabunnyLoader;
}

interface MediabunnyModule {
  BufferTarget: new () => { buffer: ArrayBuffer | null };
  CanvasSource: new (
    canvas: HTMLCanvasElement,
    encodingConfig: {
      codec: "avc";
      bitrate: number;
      alpha: "discard";
      keyFrameInterval: number;
      latencyMode: "quality";
    },
  ) => {
    add(timestamp: number, duration: number): Promise<unknown>;
    close(): void;
  };
  Mp4OutputFormat: new (options?: { fastStart?: "in-memory" }) => unknown;
  Output: new (options: { format: unknown; target: { buffer: ArrayBuffer | null } }) => {
    readonly target: { buffer: ArrayBuffer | null };
    addVideoTrack(source: unknown, metadata?: { frameRate?: number; rotation?: 0 | 90 | 180 | 270 }): unknown;
    start(): Promise<void>;
    finalize(): Promise<void>;
  };
}
type MediabunnyLoader = () => Promise<MediabunnyModule>;

const VIDEO_MIME_CANDIDATES = {
  webm: ["video/webm;codecs=vp9", "video/webm"],
} satisfies Record<RecorderVideoExportFormat, string[]>;

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

function requestCanvasFrame(stream: MediaStream): void {
  const [track] = stream.getVideoTracks();
  const requestFrame = (track as CanvasCaptureMediaStreamTrack | undefined)?.requestFrame;
  if (requestFrame && track) {
    requestFrame.call(track);
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

async function defaultMediabunnyLoader(): Promise<MediabunnyModule> {
  return (await import("mediabunny")) as unknown as MediabunnyModule;
}

export function selectVideoMimeType(format: RecorderVideoExportFormat): string | null {
  const Recorder = getMediaRecorderConstructor();

  if (!Recorder || typeof Recorder.isTypeSupported !== "function") {
    return null;
  }

  return VIDEO_MIME_CANDIDATES[format].find((type) => Recorder.isTypeSupported(type)) ?? null;
}

export function isVideoFormatSupported(format: RecorderVideoExportFormat): boolean {
  return selectVideoMimeType(format) !== null;
}

export interface VideoFramePlan {
  frameCount: number;
  frameDurationMs: number;
  durationMs: number;
}

export function videoFramePlan(durationSeconds: number, fps: number): VideoFramePlan {
  const safeDurationSeconds = Math.max(0.1, Number.isFinite(durationSeconds) ? durationSeconds : 0.1);
  const safeFps = Math.max(1, Math.round(Number.isFinite(fps) ? fps : 1));

  return {
    frameCount: Math.max(1, Math.round(safeDurationSeconds * safeFps)),
    frameDurationMs: 1000 / safeFps,
    durationMs: safeDurationSeconds * 1000,
  };
}

export function frameProgress(frameIndex: number, frameCount: number): number {
  if (frameCount <= 1) {
    return 1;
  }

  return Math.min(1, Math.max(0, frameIndex / (frameCount - 1)));
}

async function exportMp4WithWebCodecs({
  image,
  state,
  onProgress,
  mediabunnyLoader = defaultMediabunnyLoader,
}: Omit<VideoExportOptions, "format">): Promise<Blob> {
  const exportState = exportStateForMotionQuality(state);
  const canvas = document.createElement("canvas");
  canvas.width = exportState.export.width;
  canvas.height = exportState.export.height;

  const fps = exportState.motion.fps;
  const plan = videoFramePlan(exportState.motion.durationSeconds, fps);
  const media = await mediabunnyLoader();
  const target = new media.BufferTarget();
  const output = new media.Output({
    format: new media.Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });
  const videoSource = new media.CanvasSource(canvas, {
    codec: "avc",
    bitrate: videoBitsPerSecondForExport(exportState.export.quality),
    alpha: "discard",
    keyFrameInterval: 2,
    latencyMode: "quality",
  });

  output.addVideoTrack(videoSource, { frameRate: fps, rotation: 0 });
  await output.start();

  for (let frame = 0; frame < plan.frameCount; frame += 1) {
    const progress = frameProgress(frame, plan.frameCount);
    renderComposition({ canvas, image, state: exportState, frameProgress: progress });
    await videoSource.add(frame / fps, 1 / fps);
    onProgress(Math.min(1, (frame + 1) / plan.frameCount));

    if (frame % 4 === 0) {
      await wait(0);
    }
  }

  videoSource.close();
  await output.finalize();

  const buffer = output.target.buffer;
  if (!buffer) {
    throw new Error("MP4 export failed");
  }

  return new Blob([buffer], { type: "video/mp4" });
}

async function exportMediaRecorderVideo({
  format,
  image,
  state,
  onProgress,
}: Omit<VideoExportOptions, "format" | "mediabunnyLoader"> & { format: RecorderVideoExportFormat }): Promise<Blob> {
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

    const plan = videoFramePlan(exportState.motion.durationSeconds, fps);
    const startTime = performance.now();
    let nextFrameIndex = 0;

    while (nextFrameIndex < plan.frameCount) {
      if (recorderError) {
        throw recorderError;
      }

      const elapsedMs = Math.max(0, performance.now() - startTime);
      const elapsedFrameIndex = Math.min(plan.frameCount - 1, Math.floor(elapsedMs / plan.frameDurationMs));
      const frame = Math.max(nextFrameIndex, elapsedFrameIndex);
      const progress = frameProgress(frame, plan.frameCount);
      renderComposition({ canvas, image, state: exportState, frameProgress: progress });
      requestCanvasFrame(stream);
      onProgress(Math.min(1, (frame + 1) / plan.frameCount));

      nextFrameIndex = frame + 1;
      if (frame === plan.frameCount - 1) {
        break;
      }

      const nextFrameTime = startTime + nextFrameIndex * plan.frameDurationMs;
      await wait(Math.max(0, nextFrameTime - performance.now()));
    }

    await wait(Math.max(0, startTime + plan.durationMs - performance.now()));

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

export async function exportVideo(options: VideoExportOptions): Promise<Blob> {
  if (options.format === "mp4") {
    try {
      return await exportMp4WithWebCodecs(options);
    } catch (error) {
      if (error instanceof Error && error.message === "Canvas 2D context is unavailable") {
        throw error;
      }

      throw unsupportedVideoError("mp4");
    }
  }

  return exportMediaRecorderVideo({
    format: options.format,
    image: options.image,
    state: options.state,
    onProgress: options.onProgress,
  });
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
