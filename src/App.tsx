import { Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import { exportPhaseLabels, gradePresetLabels, t, titleColorLabels } from "./i18n";
import { downloadGif, exportGif } from "./lib/exportGif";
import { downloadBlob, renderStillBlob } from "./lib/exportStill";
import { jpegQualityForExport } from "./lib/exportQuality";
import { downloadVideo, exportVideo, type VideoExportFormat } from "./lib/exportVideo";
import { classifyLivePhotoFiles, packageLivp } from "./lib/livePhoto";
import { DEFAULT_PREVIEW_LONG_EDGE, outputSizeForAspect, outputSizeForState, stillExportSizeForState } from "./lib/outputSize";
import { renderComposition } from "./lib/render";
import { DEFAULT_STATE, GRADE_PRESET_ORDER, TITLE_PRESET_ORDER, applyGradePreset, applyTitlePreset, markGradeCustom } from "./presets";
import type { LabelKey } from "./i18n";
import type { AppState, EasingName, ExportFormat, ExportQuality, GradePresetName, OutputAspect, SourceKind, TitleColorMode, TitlePosition, TitlePresetName } from "./types";

const TITLE_COLOR_MODES: TitleColorMode[] = ["white", "black", "custom", "contrast"];
const EXPORT_QUALITIES: ExportQuality[] = ["small", "standard", "high"];
type StillExportFormat = Extract<ExportFormat, "jpg" | "png">;

const INTERNAL_ERROR_LABELS: Record<string, LabelKey> = {
  "Unsupported file group": "unsupportedFileGroup",
  "Image decode failed": "imageDecodeFailed",
  "Video decode failed": "videoDecodeFailed",
  "No previewable media found": "noPreviewableMedia",
  "Canvas 2D context is unavailable": "canvasUnavailable",
  "Still export failed": "stillExportFailed",
  "MP4 video recording is unavailable in this browser": "mp4Unsupported",
};

function localizedErrorMessage(language: AppState["language"], error: unknown, fallbackKey: LabelKey): string {
  if (error instanceof Error) {
    const labelKey = INTERNAL_ERROR_LABELS[error.message];
    return t(language, labelKey ?? fallbackKey);
  }

  return t(language, fallbackKey);
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image decode failed"));
    image.src = url;
  });
}

function createVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.crossOrigin = "anonymous";
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error("Video decode failed"));
    video.src = url;
  });
}

async function createImageFromVideo(url: string): Promise<{ image: HTMLImageElement; video: HTMLVideoElement }> {
  const video = await createVideo(url);

  await new Promise<void>((resolve) => {
    if (video.readyState >= 2) {
      resolve();
      return;
    }

    video.onloadeddata = () => resolve();
    video.currentTime = Math.min(0.1, Number.isFinite(video.duration) ? video.duration / 10 : 0);
  });

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is unavailable");
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const image = await createImage(canvas.toDataURL("image/png"));
  return { image, video };
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step, disabled = false, onChange }: SliderProps) {
  const formattedValue = step < 0.1 ? value.toFixed(2) : value.toFixed(1);

  return (
    <label className="field-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <strong>{formattedValue}</strong>
    </label>
  );
}

interface SwitchProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function Switch({ label, checked, disabled = false, onChange }: SwitchProps) {
  return (
    <label className="switch-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const uploadRequestRef = useRef(0);
  const activeObjectUrlsRef = useRef<string[]>([]);
  const isMountedRef = useRef(true);
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const isRendering = state.export.status === "rendering";
  const language = state.language;
  const canRender = Boolean(image && state.sourceImage);
  const exportSize = useMemo(() => outputSizeForState(state), [state]);
  const sourceForPreview = state.sourceImage ?? state.sourceVideo;
  const previewSize = useMemo(
    () => outputSizeForAspect(DEFAULT_PREVIEW_LONG_EDGE, state.motion.outputAspect, sourceForPreview?.width, sourceForPreview?.height),
    [sourceForPreview?.height, sourceForPreview?.width, state.motion.outputAspect],
  );
  const compositionState = useMemo<AppState>(
    () => ({
      sourceKind: state.sourceKind,
      sourceImage: state.sourceImage,
      sourceVideo: state.sourceVideo,
      language: state.language,
      grade: state.grade,
      title: state.title,
      motion: state.motion,
      export: {
        format: state.export.format,
        quality: state.export.quality,
        width: exportSize.width,
        height: exportSize.height,
        progress: 0,
        status: "idle",
        phase: "idle",
        error: "",
      },
    }),
    [
      state.sourceKind,
      state.sourceImage,
      state.sourceVideo,
      state.language,
      state.grade,
      state.title,
      state.motion,
      state.export.format,
      state.export.quality,
      exportSize.width,
      exportSize.height,
    ],
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      uploadRequestRef.current += 1;

      revokeActiveObjectUrls();
    };
  }, []);

  function revokeActiveObjectUrls() {
    for (const url of activeObjectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    activeObjectUrlsRef.current = [];
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) {
      return;
    }

    canvas.width = previewSize.width;
    canvas.height = previewSize.height;
    renderComposition({ canvas, image, state: compositionState });
  }, [compositionState, image, previewSize]);

  async function handleFiles(files: File[]) {
    if (isRendering) {
      return;
    }

    const requestId = uploadRequestRef.current + 1;
    uploadRequestRef.current = requestId;
    const classification = classifyLivePhotoFiles(files);

    if (classification.kind === "unsupported") {
      setState((current) => ({
        ...current,
        export: { ...current.export, status: "failed", phase: "failed", error: t(language, "unsupportedFileGroup") },
      }));
      return;
    }

    const urls: string[] = [];
    const imageUrl = classification.imageFile ? URL.createObjectURL(classification.imageFile) : null;
    const videoUrl = classification.videoFile ? URL.createObjectURL(classification.videoFile) : null;
    if (imageUrl) {
      urls.push(imageUrl);
    }
    if (videoUrl) {
      urls.push(videoUrl);
    }

    try {
      const decoded = imageUrl ? await createImage(imageUrl) : null;
      const video = videoUrl ? await createVideo(videoUrl) : null;
      const videoPoster = !decoded && videoUrl ? await createImageFromVideo(videoUrl) : null;
      const previewImage = decoded ?? videoPoster?.image ?? null;

      if (!previewImage) {
        throw new Error("No previewable media found");
      }

      if (!isMountedRef.current || uploadRequestRef.current !== requestId) {
        for (const url of urls) {
          URL.revokeObjectURL(url);
        }
        return;
      }

      revokeActiveObjectUrls();
      activeObjectUrlsRef.current = urls;
      setImage(previewImage);
      setState((current) => ({
        ...current,
        sourceKind: classification.kind as SourceKind,
        sourceImage: {
          name: classification.imageFile?.name ?? classification.videoFile?.name ?? "video-poster",
          url: imageUrl ?? videoUrl ?? "",
          width: previewImage.naturalWidth,
          height: previewImage.naturalHeight,
        },
        sourceVideo:
          classification.videoFile && videoUrl
            ? {
                name: classification.videoFile.name,
                url: videoUrl,
                width: video?.videoWidth ?? videoPoster?.video.videoWidth ?? 0,
                height: video?.videoHeight ?? videoPoster?.video.videoHeight ?? 0,
                duration: video?.duration ?? videoPoster?.video.duration ?? 0,
                type: classification.videoFile.type || "video",
              }
            : null,
        export: { ...current.export, status: "idle", phase: "idle", error: "" },
      }));
    } catch (error) {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
      if (!isMountedRef.current || uploadRequestRef.current !== requestId) {
        return;
      }

      setState((current) => ({
        ...current,
        export: {
          ...current.export,
          status: "failed",
          phase: "failed",
          error: localizedErrorMessage(language, error, "imageDecodeFailed"),
        },
      }));
    }
  }

  function updateGrade(patch: Partial<AppState["grade"]>) {
    setState((current) => ({
      ...current,
      grade: markGradeCustom({ ...current.grade, ...patch }),
    }));
  }

  function handleGradePreset(nextPreset: GradePresetName) {
    if (isRendering || nextPreset === "custom") {
      return;
    }

    setState((current) => applyGradePreset(current, nextPreset));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (isRendering) {
      event.dataTransfer.dropEffect = "none";
      return;
    }

    const files = [...event.dataTransfer.files];

    if (files.length > 0) {
      void handleFiles(files);
    }
  }

  async function handleStillExport(format: StillExportFormat) {
    if (!image || isRendering) {
      return;
    }

    const type = format === "jpg" ? "image/jpeg" : "image/png";
    const quality = format === "jpg" ? jpegQualityForExport(state.export.quality) : undefined;
    const stillExportSize = stillExportSizeForState(state);
    const exportState: AppState = {
      ...state,
      export: { ...state.export, format, width: stillExportSize.width, height: stillExportSize.height },
    };

    setState((current) => ({
      ...current,
      export: { ...current.export, format, progress: 0, status: "rendering", phase: "preparing-still", error: "" },
    }));
    uploadRequestRef.current += 1;

    try {
      const blob = await renderStillBlob(image, exportState, type, quality);
      setState((current) => ({
        ...current,
        export: { ...current.export, phase: "downloading" },
      }));
      downloadBlob(blob, `endfieldize.${format}`);
      setState((current) => ({
        ...current,
        export: { ...current.export, progress: 1, status: "done", phase: "done" },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        export: {
          ...current.export,
          status: "failed",
          phase: "failed",
          error: localizedErrorMessage(language, error, "stillExportFailed"),
        },
      }));
    }
  }

  async function handleVideoExport(format: VideoExportFormat) {
    if (!image || isRendering) {
      return;
    }

    const exportState: AppState = {
      ...state,
      export: { ...state.export, format, width: exportSize.width, height: exportSize.height },
    };

    setState((current) => ({
      ...current,
      export: { ...current.export, format, progress: 0, status: "rendering", phase: "rendering-motion", error: "" },
    }));
    uploadRequestRef.current += 1;

    try {
      const blob = await exportVideo({
        format,
        image,
        state: exportState,
        onProgress: (progress) => {
          setState((current) => ({
            ...current,
            export: { ...current.export, progress },
          }));
        },
      });

      downloadVideo(blob, `endfieldize.${format}`);
      setState((current) => ({
        ...current,
        export: { ...current.export, progress: 1, status: "done", phase: "done" },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        export: {
          ...current.export,
          status: "failed",
          phase: "failed",
          error: localizedErrorMessage(language, error, format === "mp4" ? "mp4ExportFailed" : "videoExportFailed"),
        },
      }));
    }
  }

  async function handleGifExport() {
    if (!image || isRendering) {
      return;
    }

    const exportState: AppState = {
      ...state,
      export: { ...state.export, format: "gif", width: exportSize.width, height: exportSize.height },
    };

    setState((current) => ({
      ...current,
      export: { ...current.export, format: "gif", progress: 0, status: "rendering", phase: "encoding-gif", error: "" },
    }));
    uploadRequestRef.current += 1;

    try {
      const blob = await exportGif({
        image,
        state: exportState,
        onProgress: (progress) => {
          setState((current) => ({
            ...current,
            export: { ...current.export, progress },
          }));
        },
      });

      downloadGif(blob, "endfieldize.gif");
      setState((current) => ({
        ...current,
        export: { ...current.export, progress: 1, status: "done", phase: "done" },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        export: {
          ...current.export,
          status: "failed",
          phase: "failed",
          error: localizedErrorMessage(language, error, "gifExportFailed"),
        },
      }));
    }
  }

  async function handleLivePairExport() {
    if (!image || isRendering) {
      return;
    }

    setState((current) => ({
      ...current,
      export: { ...current.export, format: "livp", progress: 0, status: "rendering", phase: "preparing-still", error: "" },
    }));

    try {
      const stillName = "still.png";
      const motionName = "motion.webm";
      const motionExportState: AppState = {
        ...state,
        export: { ...state.export, format: "webm", width: exportSize.width, height: exportSize.height },
      };
      const stillBlob = await renderStillBlob(image, {
        ...state,
        export: { ...state.export, width: exportSize.width, height: exportSize.height },
      });
      setState((current) => ({
        ...current,
        export: { ...current.export, progress: 0.2, phase: "rendering-motion" },
      }));
      const motionBlob = await exportVideo({
        format: "webm",
        image,
        state: motionExportState,
        onProgress: (progress) => {
          setState((current) => ({
            ...current,
            export: { ...current.export, progress: 0.2 + progress * 0.68 },
          }));
        },
      });

      setState((current) => ({
        ...current,
        export: { ...current.export, progress: 0.9, phase: "packaging-live-photo" },
      }));
      const livpBlob = await packageLivp({
        still: stillBlob,
        motion: motionBlob,
        stillName,
        motionName,
        title: state.title.title,
        sourceKind: state.sourceKind,
        sourceVideoName: state.sourceVideo?.name,
      });

      setState((current) => ({
        ...current,
        export: { ...current.export, phase: "downloading" },
      }));
      downloadBlob(livpBlob, "endfieldize.livp");
      setState((current) => ({
        ...current,
        export: { ...current.export, progress: 1, status: "done", phase: "done" },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        export: {
          ...current.export,
          status: "failed",
          phase: "failed",
          error: localizedErrorMessage(language, error, "livpExportFailed"),
        },
      }));
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ENDFIELDIZE</p>
          <h1>{t(language, "workspace")}</h1>
        </div>
        <div className="topbar-actions">
          <div className="language-switch" aria-label={t(language, "language")}>
            {(["zh", "en"] as const).map((nextLanguage) => (
              <button
                key={nextLanguage}
                type="button"
                className={language === nextLanguage ? "is-active" : ""}
                aria-label={nextLanguage === "zh" ? "中文" : "English"}
                aria-pressed={language === nextLanguage}
                disabled={isRendering}
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    language: nextLanguage,
                  }))
                }
              >
                {nextLanguage}
              </button>
            ))}
          </div>
          <button className="primary-action" type="button" disabled={isRendering} onClick={() => uploadInputRef.current?.click()}>
            <Upload size={17} aria-hidden="true" />
            {t(language, "upload")}
          </button>
        </div>
        <input
          ref={uploadInputRef}
          className="upload-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
          multiple
          disabled={isRendering}
          onChange={(event) => {
            const files = event.target.files ? [...event.target.files] : [];
            if (files.length > 0) {
              void handleFiles(files);
            }
          }}
        />
      </header>

      <section className="workspace" aria-label={t(language, "workspace")}>
        <div
          className="preview-stage"
          style={{ "--landscape-copy": `"${t(language, "landscapeRecommended")}"` } as CSSProperties}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = isRendering ? "none" : "copy";
          }}
          onDrop={handleDrop}
        >
          <canvas
            ref={canvasRef}
            className={canRender ? "preview-canvas" : "preview-canvas is-empty"}
            style={{ "--preview-aspect": `${previewSize.width} / ${previewSize.height}` } as CSSProperties}
          />
          {!canRender && <div className="empty-preview">{t(language, "dropImage")}</div>}
        </div>

        <aside className="control-panel" aria-label={t(language, "parameters")}>
          <div className="panel-section">
            <p className="eyebrow">01 / {t(language, "source").toUpperCase()}</p>
            <p>{state.sourceImage ? state.sourceImage.name : t(language, "noImageLoaded")}</p>
            <p className="status-line">
              {t(
                language,
                state.sourceKind === "image"
                  ? "sourceKindImage"
                  : state.sourceKind === "live-pair"
                    ? "sourceKindLivePair"
                    : "sourceKindVideoOnly",
              )}
              {state.sourceVideo ? ` / ${state.sourceVideo.name}` : ""}
            </p>
          </div>

          <div className="panel-section">
            <p className="eyebrow">02 / {t(language, "grade").toUpperCase()}</p>
            <Switch
              label={t(language, "gradeEnabled")}
              checked={state.grade.enabled}
              disabled={isRendering}
              onChange={(checked) =>
                setState((current) => ({
                  ...current,
                  grade: { ...current.grade, enabled: checked },
                }))
              }
            />
            <label className="text-field">
              <span>{t(language, "gradePreset")}</span>
              <select value={state.grade.preset} disabled={isRendering} onChange={(event) => handleGradePreset(event.target.value as GradePresetName)}>
                {GRADE_PRESET_ORDER.map((preset) => (
                  <option key={preset} value={preset} disabled={preset === "custom"}>
                    {gradePresetLabels[language][preset]}
                  </option>
                ))}
              </select>
            </label>
            <Slider
              label={t(language, "gradeAmount")}
              value={state.grade.amount}
              min={0}
              max={1}
              step={0.01}
              disabled={isRendering}
              onChange={(value) => updateGrade({ amount: value })}
            />
            <Slider
              label={t(language, "gradeCooling")}
              value={state.grade.cooling}
              min={0}
              max={1}
              step={0.01}
              disabled={isRendering}
              onChange={(value) => updateGrade({ cooling: value })}
            />
            <Slider
              label={t(language, "gradeHazeDepth")}
              value={state.grade.hazeDepth}
              min={0}
              max={1}
              step={0.01}
              disabled={isRendering}
              onChange={(value) => updateGrade({ hazeDepth: value })}
            />
            <Slider
              label={t(language, "gradeDiffuseLight")}
              value={state.grade.diffuseLight}
              min={0}
              max={1}
              step={0.01}
              disabled={isRendering}
              onChange={(value) => updateGrade({ diffuseLight: value })}
            />
            <Slider
              label={t(language, "gradeIndustrialGray")}
              value={state.grade.industrialGray}
              min={0}
              max={1}
              step={0.01}
              disabled={isRendering}
              onChange={(value) => updateGrade({ industrialGray: value })}
            />
            <details className="advanced-panel">
              <summary>{t(language, "advancedGrade")}</summary>
              <Slider
                label={t(language, "gradeExposure")}
                value={state.grade.exposure}
                min={-1}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) => updateGrade({ exposure: value })}
              />
              <Slider
                label={t(language, "gradeContrast")}
                value={state.grade.contrast}
                min={-1}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) => updateGrade({ contrast: value })}
              />
              <Slider
                label={t(language, "gradeHighlights")}
                value={state.grade.highlights}
                min={-1}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) => updateGrade({ highlights: value })}
              />
              <Slider
                label={t(language, "gradeShadows")}
                value={state.grade.shadows}
                min={-1}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) => updateGrade({ shadows: value })}
              />
              <Slider
                label={t(language, "gradeWhites")}
                value={state.grade.whites}
                min={-1}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) => updateGrade({ whites: value })}
              />
              <Slider
                label={t(language, "gradeBlacks")}
                value={state.grade.blacks}
                min={-1}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) => updateGrade({ blacks: value })}
              />
              <Slider
                label={t(language, "gradeTexture")}
                value={state.grade.texture}
                min={-1}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) => updateGrade({ texture: value })}
              />
              <Slider
                label={t(language, "gradeClarity")}
                value={state.grade.clarity}
                min={-1}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) => updateGrade({ clarity: value })}
              />
              <Slider
                label={t(language, "gradeDehaze")}
                value={state.grade.dehaze}
                min={0}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) => updateGrade({ dehaze: value })}
              />
              <Slider
                label={t(language, "gradeVibrance")}
                value={state.grade.vibrance}
                min={-1}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) => updateGrade({ vibrance: value })}
              />
              <Slider
                label={t(language, "gradeSaturation")}
                value={state.grade.saturation}
                min={-1}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) => updateGrade({ saturation: value })}
              />
              <Slider
                label={t(language, "gradeBlueDesaturation")}
                value={state.grade.blueDesaturation}
                min={0}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) => updateGrade({ blueDesaturation: value })}
              />
              <Slider
                label={t(language, "gradeHazeFalloff")}
                value={state.grade.hazeFalloff}
                min={0}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) => updateGrade({ hazeFalloff: value })}
              />
              <Slider
                label={t(language, "gradeGrain")}
                value={state.grade.grain}
                min={0}
                max={0.3}
                step={0.01}
                disabled={isRendering}
                onChange={(value) => updateGrade({ grain: value })}
              />
              <Slider
                label={t(language, "gradeVignette")}
                value={state.grade.vignette}
                min={0}
                max={0.3}
                step={0.01}
                disabled={isRendering}
                onChange={(value) => updateGrade({ vignette: value })}
              />
            </details>
          </div>

          <div className="panel-section">
            <p className="eyebrow">03 / {t(language, "title").toUpperCase()}</p>
            <Switch
              label={t(language, "titleEnabled")}
              checked={state.title.enabled}
              disabled={isRendering}
              onChange={(checked) =>
                setState((current) => ({
                  ...current,
                  title: { ...current.title, enabled: checked },
                }))
              }
            />
            <label className="text-field">
              <span>{t(language, "titlePreset")}</span>
              <select
                value={state.title.preset}
                disabled={isRendering}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    title: applyTitlePreset(current.title, event.target.value as TitlePresetName),
                  }))
                }
              >
                {TITLE_PRESET_ORDER.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-field">
              <span>{t(language, "titleText")}</span>
              <input
                type="text"
                value={state.title.title}
                disabled={isRendering}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    title: { ...current.title, title: event.target.value },
                  }))
                }
              />
            </label>
            <label className="text-field">
              <span>{t(language, "subtitle")}</span>
              <input
                type="text"
                value={state.title.subtitle}
                disabled={isRendering}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    title: { ...current.title, subtitle: event.target.value },
                  }))
                }
              />
            </label>
            <label className="text-field">
              <span>{t(language, "code")}</span>
              <input
                type="text"
                value={state.title.code}
                disabled={isRendering}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    title: { ...current.title, code: event.target.value },
                  }))
                }
              />
            </label>
            <Slider
              label={t(language, "scale")}
              value={state.title.scale}
              min={0.5}
              max={2.6}
              step={0.01}
              disabled={isRendering}
              onChange={(value) =>
                setState((current) => ({
                  ...current,
                  title: { ...current.title, scale: value },
                }))
              }
            />
            <details className="advanced-panel">
              <summary>{t(language, "advancedTitle")}</summary>
              <label className="text-field">
                <span>{t(language, "titleColor")}</span>
                <select
                  value={state.title.colorMode}
                  disabled={isRendering}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      title: { ...current.title, colorMode: event.target.value as TitleColorMode },
                    }))
                  }
                >
                  {TITLE_COLOR_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {titleColorLabels[language][mode]}
                    </option>
                  ))}
                </select>
              </label>
              {state.title.colorMode === "custom" ? (
                <label className="color-field">
                  <span>{t(language, "customColor")}</span>
                  <input
                    type="color"
                    value={state.title.customColor}
                    disabled={isRendering}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        title: { ...current.title, customColor: event.target.value },
                      }))
                    }
                  />
                </label>
              ) : null}
              <label className="text-field">
                <span>{t(language, "position")}</span>
                <select
                  value={state.title.position}
                  disabled={isRendering}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      title: { ...current.title, position: event.target.value as TitlePosition },
                    }))
                  }
                >
                  <option value="top-left">TOP LEFT</option>
                  <option value="center-left">CENTER LEFT</option>
                  <option value="center">CENTER</option>
                  <option value="lower-left">LOWER LEFT</option>
                  <option value="lower-right">LOWER RIGHT</option>
                </select>
              </label>
              <Slider
                label={t(language, "tracking")}
                value={state.title.tracking}
                min={0}
                max={0.5}
                step={0.01}
                disabled={isRendering}
                onChange={(value) =>
                  setState((current) => ({
                    ...current,
                    title: { ...current.title, tracking: value },
                  }))
                }
              />
              <Slider
                label={t(language, "opacity")}
                value={state.title.opacity}
                min={0}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) =>
                  setState((current) => ({
                    ...current,
                    title: { ...current.title, opacity: value },
                  }))
                }
              />
              <Slider
                label={t(language, "lineWeight")}
                value={state.title.lineWeight}
                min={0.5}
                max={4}
                step={0.5}
                disabled={isRendering}
                onChange={(value) =>
                  setState((current) => ({
                    ...current,
                    title: { ...current.title, lineWeight: value },
                  }))
                }
              />
              <Slider
                label={t(language, "shadowStrength")}
                value={state.title.shadowStrength}
                min={0}
                max={0.8}
                step={0.01}
                disabled={isRendering}
                onChange={(value) =>
                  setState((current) => ({
                    ...current,
                    title: { ...current.title, shadowStrength: value },
                  }))
                }
              />
              <Slider
                label={t(language, "offsetX")}
                value={state.title.offsetX}
                min={-0.35}
                max={0.35}
                step={0.01}
                disabled={isRendering}
                onChange={(value) =>
                  setState((current) => ({
                    ...current,
                    title: { ...current.title, offsetX: value },
                  }))
                }
              />
              <Slider
                label={t(language, "offsetY")}
                value={state.title.offsetY}
                min={-0.35}
                max={0.35}
                step={0.01}
                disabled={isRendering}
                onChange={(value) =>
                  setState((current) => ({
                    ...current,
                    title: { ...current.title, offsetY: value },
                  }))
                }
              />
              <Switch
                label={t(language, "hudMarks")}
                checked={state.title.hudMarks}
                disabled={isRendering}
                onChange={(checked) =>
                  setState((current) => ({
                    ...current,
                    title: { ...current.title, hudMarks: checked },
                  }))
                }
              />
            </details>
          </div>

          <div className="panel-section">
            <p className="eyebrow">04 / {t(language, "motion").toUpperCase()}</p>
            <Switch
              label={t(language, "motionEnabled")}
              checked={state.motion.enabled}
              disabled={isRendering}
              onChange={(checked) =>
                setState((current) => ({
                  ...current,
                  motion: { ...current.motion, enabled: checked },
                }))
              }
            />
            <Slider
              label={t(language, "duration")}
              value={state.motion.durationSeconds}
              min={2}
              max={12}
              step={0.5}
              disabled={isRendering}
              onChange={(value) =>
                setState((current) => ({
                  ...current,
                  motion: { ...current.motion, durationSeconds: value },
                }))
              }
            />
            <Slider
              label={t(language, "endScale")}
              value={state.motion.endScale}
              min={1}
              max={1.3}
              step={0.01}
              disabled={isRendering}
              onChange={(value) =>
                setState((current) => ({
                  ...current,
                  motion: { ...current.motion, endScale: value },
                }))
              }
            />
            <details className="advanced-panel">
              <summary>{t(language, "advancedMotion")}</summary>
              <Slider
                label={t(language, "startScale")}
                value={state.motion.startScale}
                min={0.8}
                max={1.2}
                step={0.01}
                disabled={isRendering}
                onChange={(value) =>
                  setState((current) => ({
                    ...current,
                    motion: { ...current.motion, startScale: value },
                  }))
                }
              />
              <Slider
                label={t(language, "fps")}
                value={state.motion.fps}
                min={12}
                max={60}
                step={1}
                disabled={isRendering}
                onChange={(value) =>
                  setState((current) => ({
                    ...current,
                    motion: { ...current.motion, fps: value },
                  }))
                }
              />
              <Slider
                label={t(language, "focusX")}
                value={state.motion.focusX}
                min={0}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) =>
                  setState((current) => ({
                    ...current,
                    motion: { ...current.motion, focusX: value },
                  }))
                }
              />
              <Slider
                label={t(language, "focusY")}
                value={state.motion.focusY}
                min={0}
                max={1}
                step={0.01}
                disabled={isRendering}
                onChange={(value) =>
                  setState((current) => ({
                    ...current,
                    motion: { ...current.motion, focusY: value },
                  }))
                }
              />
              <label className="text-field">
                <span>{t(language, "easing")}</span>
                <select
                  value={state.motion.easing}
                  disabled={isRendering}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      motion: { ...current.motion, easing: event.target.value as EasingName },
                    }))
                  }
                >
                  <option value="linear">LINEAR</option>
                  <option value="ease-in-out">EASE IN OUT</option>
                  <option value="cinematic">CINEMATIC</option>
                </select>
              </label>
              <label className="text-field">
                <span>{t(language, "aspect")}</span>
                <select
                  value={state.motion.outputAspect}
                  disabled={isRendering}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      motion: { ...current.motion, outputAspect: event.target.value as OutputAspect },
                    }))
                  }
                >
                  <option value="source">SOURCE</option>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                </select>
              </label>
            </details>
          </div>

          <div className="panel-section">
            <p className="eyebrow">05 / {t(language, "export").toUpperCase()}</p>
            <label className="text-field">
              <span className="label-with-note">
                {t(language, "exportQuality")}
                <small>{t(language, "exportQualityHint")}</small>
              </span>
              <select
                aria-label={t(language, "exportQuality")}
                value={state.export.quality}
                disabled={isRendering}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    export: { ...current.export, quality: event.target.value as ExportQuality },
                  }))
                }
              >
                {EXPORT_QUALITIES.map((quality) => (
                  <option key={quality} value={quality}>
                    {t(language, quality === "small" ? "exportQualitySmall" : quality === "standard" ? "exportQualityStandard" : "exportQualityHigh")}
                  </option>
                ))}
              </select>
            </label>
            <div className="export-group">
              <p className="export-group-label">{t(language, "imageExportGroup")}</p>
              <div className="export-actions export-actions-two">
                <button type="button" disabled={!image || isRendering} onClick={() => void handleStillExport("jpg")}>
                  {t(language, "exportJpg")}
                </button>
                <button type="button" disabled={!image || isRendering} onClick={() => void handleStillExport("png")}>
                  {t(language, "exportPng")}
                </button>
              </div>
            </div>
            <div className="export-group">
              <p className="export-group-label">{t(language, "videoExportGroup")}</p>
              <div className="export-actions export-actions-two">
                <button type="button" disabled={!image || isRendering} onClick={() => void handleVideoExport("mp4")}>
                  {t(language, "exportMp4")}
                </button>
                <button type="button" disabled={!image || isRendering} onClick={() => void handleGifExport()}>
                  {t(language, "exportGif")}
                </button>
              </div>
            </div>
            <details className="advanced-panel export-advanced">
              <summary>{t(language, "advancedExport")}</summary>
              <div className="export-actions export-actions-secondary">
                <button type="button" disabled={!image || isRendering} onClick={() => void handleVideoExport("webm")}>
                  {t(language, "exportWebm")}
                </button>
                <button type="button" disabled={!image || isRendering} onClick={() => void handleLivePairExport()}>
                  {t(language, "exportLivp")}
                </button>
              </div>
            </details>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${Math.round(state.export.progress * 100)}%` }} />
            </div>
            <p className="status-line">{exportPhaseLabels[language][state.export.phase]}</p>
          </div>

          {state.export.error && <p className="status-error">{state.export.error}</p>}
        </aside>
      </section>

      <footer className="site-footer">
        <span>Powered By </span>
        <a target="_blank" rel="noreferrer" href="https://github.com/CreeperLKF/Endfieldize">
          CreeperLKF/Endfieldize
        </a>
        <span> | Inspired by </span>
        <a target="_blank" rel="noreferrer" href="https://www.bilibili.com/video/BV19WwqzEEUk">
          骆驼肉
        </a>
        <span> | </span>
        <a className="icp" target="_blank" rel="noreferrer" href="https://beian.miit.gov.cn/">
          京ICP备2024091870号-1
        </a>
      </footer>
    </main>
  );
}
