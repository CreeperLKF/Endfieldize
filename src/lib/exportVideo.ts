import type { AppState } from "../types";
import { renderComposition } from "./render";

export interface VideoExportOptions {
  image: HTMLImageElement;
  state: AppState;
  onProgress: (progress: number) => void;
}

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

export async function exportVideo({ image, state, onProgress }: VideoExportOptions): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = state.export.width;
  canvas.height = state.export.height;

  if (!canvas.captureStream) {
    throw new Error("Canvas video capture is unavailable in this browser");
  }

  if (!window.MediaRecorder) {
    throw new Error("Video recording is unavailable in this browser");
  }

  const fps = state.motion.fps;
  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
  let recorder: MediaRecorder;

  try {
    recorder = new MediaRecorder(stream, { mimeType });
  } catch (error) {
    stopStream(stream);
    throw error;
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

    const totalFrames = Math.max(1, Math.round(state.motion.durationSeconds * fps));
    const frameDuration = 1000 / fps;
    const startTime = performance.now();

    for (let frame = 0; frame <= totalFrames; frame += 1) {
      if (recorderError) {
        throw recorderError;
      }

      const progress = frame / totalFrames;
      renderComposition({ canvas, image, state, frameProgress: progress });
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
