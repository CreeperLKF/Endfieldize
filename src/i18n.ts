import type { ExportPhase, GradePresetName, Language, TitleColorMode } from "./types";

export type LabelKey =
  | "upload"
  | "dropImage"
  | "workspace"
  | "parameters"
  | "preset"
  | "source"
  | "grade"
  | "title"
  | "motion"
  | "export"
  | "language"
  | "landscapeRecommended"
  | "noImageLoaded"
  | "sourceKindImage"
  | "sourceKindLivePair"
  | "sourceKindVideoOnly"
  | "gradeEnabled"
  | "gradePreset"
  | "gradeAmount"
  | "gradeExposure"
  | "gradeContrast"
  | "gradeHighlights"
  | "gradeShadows"
  | "gradeWhites"
  | "gradeBlacks"
  | "gradeTexture"
  | "gradeClarity"
  | "gradeDehaze"
  | "gradeVibrance"
  | "gradeSaturation"
  | "gradeCooling"
  | "gradeBlueDesaturation"
  | "gradeHazeDepth"
  | "gradeHazeFalloff"
  | "gradeDiffuseLight"
  | "gradeIndustrialGray"
  | "gradeGrain"
  | "gradeVignette"
  | "advancedGrade"
  | "titleEnabled"
  | "titlePreset"
  | "titleText"
  | "subtitle"
  | "code"
  | "position"
  | "alignment"
  | "scale"
  | "tracking"
  | "opacity"
  | "lineWeight"
  | "hudMarks"
  | "safeMargin"
  | "offsetX"
  | "offsetY"
  | "shadowStrength"
  | "titleColor"
  | "customColor"
  | "advancedTitle"
  | "motionEnabled"
  | "duration"
  | "startScale"
  | "endScale"
  | "focusX"
  | "focusY"
  | "fps"
  | "easing"
  | "aspect"
  | "advancedMotion"
  | "imageExportGroup"
  | "videoExportGroup"
  | "exportJpg"
  | "exportPng"
  | "exportMp4"
  | "exportWebm"
  | "exportGif"
  | "exportLivp"
  | "exportQuality"
  | "exportQualityHint"
  | "exportQualitySmall"
  | "exportQualityStandard"
  | "exportQualityHigh"
  | "advancedExport"
  | "unsupportedFileGroup"
  | "imageDecodeFailed"
  | "videoDecodeFailed"
  | "noPreviewableMedia"
  | "canvasUnavailable"
  | "stillExportFailed"
  | "mp4ExportFailed"
  | "mp4Unsupported"
  | "videoExportFailed"
  | "livePairExportFailed"
  | "gifExportFailed"
  | "livpExportFailed"
  | "exportFailed";

export const labels = {
  zh: {
    upload: "上传",
    dropImage: "拖入图片",
    workspace: "影像终端工作区",
    parameters: "图像参数",
    preset: "预设",
    source: "素材",
    grade: "调色",
    title: "标题",
    motion: "运镜",
    export: "导出",
    language: "语言",
    landscapeRecommended: "建议横屏使用以获得更完整的预览和参数控制。",
    noImageLoaded: "未载入图片",
    sourceKindImage: "图片",
    sourceKindLivePair: "Live Photo 组合",
    sourceKindVideoOnly: "仅视频",
    gradeEnabled: "启用调色",
    gradePreset: "调色预设",
    gradeAmount: "强度",
    gradeExposure: "曝光",
    gradeContrast: "对比度",
    gradeHighlights: "高光",
    gradeShadows: "阴影",
    gradeWhites: "白色色阶",
    gradeBlacks: "黑色色阶",
    gradeTexture: "纹理",
    gradeClarity: "清晰度",
    gradeDehaze: "去雾",
    gradeVibrance: "自然饱和度",
    gradeSaturation: "饱和度",
    gradeCooling: "冷色调",
    gradeBlueDesaturation: "蓝色降饱和",
    gradeHazeDepth: "雾气深度",
    gradeHazeFalloff: "雾气衰减",
    gradeDiffuseLight: "漫射光",
    gradeIndustrialGray: "工业灰",
    gradeGrain: "颗粒",
    gradeVignette: "暗角",
    advancedGrade: "高级调色",
    titleEnabled: "显示标题",
    titlePreset: "标题预设",
    titleText: "主标题",
    subtitle: "副标题",
    code: "编号",
    position: "位置",
    alignment: "对齐",
    scale: "缩放",
    tracking: "字距",
    opacity: "不透明度",
    lineWeight: "线条粗细",
    hudMarks: "HUD 标记",
    safeMargin: "安全边距",
    offsetX: "水平偏移",
    offsetY: "垂直偏移",
    shadowStrength: "阴影强度",
    titleColor: "标题颜色",
    customColor: "自定义颜色",
    advancedTitle: "高级标题",
    motionEnabled: "启用推近",
    duration: "时长",
    startScale: "起始缩放",
    endScale: "结束缩放",
    focusX: "焦点 X",
    focusY: "焦点 Y",
    fps: "帧率",
    easing: "缓动",
    aspect: "画幅",
    advancedMotion: "高级运镜",
    imageExportGroup: "图片",
    videoExportGroup: "视频",
    exportJpg: "JPG",
    exportPng: "PNG",
    exportMp4: "MP4",
    exportWebm: "WEBM",
    exportGif: "GIF",
    exportLivp: ".LIVP",
    exportQuality: "导出质量",
    exportQualityHint: "GIF 推荐小，其它推荐高质量",
    exportQualitySmall: "小",
    exportQualityStandard: "标准",
    exportQualityHigh: "高质量",
    advancedExport: "高级导出",
    unsupportedFileGroup: "不支持的文件组合",
    imageDecodeFailed: "图片解码失败",
    videoDecodeFailed: "视频解码失败",
    noPreviewableMedia: "未找到可预览媒体",
    canvasUnavailable: "Canvas 2D 上下文不可用",
    stillExportFailed: "静帧导出失败",
    mp4ExportFailed: "MP4 导出失败",
    mp4Unsupported: "当前浏览器不支持 MP4 导出。请在高级导出中使用 WEBM。",
    videoExportFailed: "视频导出失败",
    livePairExportFailed: "Live Photo 导出失败",
    gifExportFailed: "GIF 导出失败",
    livpExportFailed: ".livp 导出失败",
    exportFailed: "导出失败",
  },
  en: {
    upload: "Upload",
    dropImage: "Drop image",
    workspace: "Image terminal workspace",
    parameters: "Image parameters",
    preset: "Preset",
    source: "Source",
    grade: "Grade",
    title: "Title",
    motion: "Motion",
    export: "Export",
    language: "Language",
    landscapeRecommended: "Use landscape orientation for a fuller preview and parameter controls.",
    noImageLoaded: "No image loaded",
    sourceKindImage: "Image",
    sourceKindLivePair: "Live Photo pair",
    sourceKindVideoOnly: "Video only",
    gradeEnabled: "Color grade",
    gradePreset: "Grade preset",
    gradeAmount: "Amount",
    gradeExposure: "Exposure",
    gradeContrast: "Contrast",
    gradeHighlights: "Highlights",
    gradeShadows: "Shadows",
    gradeWhites: "Whites",
    gradeBlacks: "Blacks",
    gradeTexture: "Texture",
    gradeClarity: "Clarity",
    gradeDehaze: "Dehaze",
    gradeVibrance: "Vibrance",
    gradeSaturation: "Saturation",
    gradeCooling: "Cooling",
    gradeBlueDesaturation: "Blue desaturation",
    gradeHazeDepth: "Haze depth",
    gradeHazeFalloff: "Haze falloff",
    gradeDiffuseLight: "Diffuse light",
    gradeIndustrialGray: "Industrial gray",
    gradeGrain: "Grain",
    gradeVignette: "Vignette",
    advancedGrade: "Advanced grade",
    titleEnabled: "Show title",
    titlePreset: "Title preset",
    titleText: "Title",
    subtitle: "Subtitle",
    code: "Code",
    position: "Position",
    alignment: "Alignment",
    scale: "Scale",
    tracking: "Tracking",
    opacity: "Opacity",
    lineWeight: "Line weight",
    hudMarks: "HUD marks",
    safeMargin: "Safe margin",
    offsetX: "Offset X",
    offsetY: "Offset Y",
    shadowStrength: "Shadow strength",
    titleColor: "Title color",
    customColor: "Custom color",
    advancedTitle: "Advanced title",
    motionEnabled: "Push in",
    duration: "Duration",
    startScale: "Start scale",
    endScale: "End scale",
    focusX: "Focus X",
    focusY: "Focus Y",
    fps: "FPS",
    easing: "Easing",
    aspect: "Aspect",
    advancedMotion: "Advanced motion",
    imageExportGroup: "Image",
    videoExportGroup: "Video",
    exportJpg: "JPG",
    exportPng: "PNG",
    exportMp4: "MP4",
    exportWebm: "WEBM",
    exportGif: "GIF",
    exportLivp: ".LIVP",
    exportQuality: "Export quality",
    exportQualityHint: "Small for GIF, High for others",
    exportQualitySmall: "Small",
    exportQualityStandard: "Standard",
    exportQualityHigh: "High",
    advancedExport: "Advanced export",
    unsupportedFileGroup: "Unsupported file group",
    imageDecodeFailed: "Image decode failed",
    videoDecodeFailed: "Video decode failed",
    noPreviewableMedia: "No previewable media found",
    canvasUnavailable: "Canvas 2D context is unavailable",
    stillExportFailed: "Still export failed",
    mp4ExportFailed: "MP4 export failed",
    mp4Unsupported: "MP4 export is not supported in this browser. Use Advanced WEBM.",
    videoExportFailed: "Video export failed",
    livePairExportFailed: "Live Photo export failed",
    gifExportFailed: "GIF export failed",
    livpExportFailed: ".livp export failed",
    exportFailed: "Export failed",
  },
} satisfies Record<Language, Record<LabelKey, string>>;

export const gradePresetLabels = {
  zh: {
    default: "默认",
    wuling1: "武陵 1",
    wuling2: "武陵 2",
    wuling3: "武陵 3",
    custom: "自定义",
  },
  en: {
    default: "Default",
    wuling1: "Wuling 1",
    wuling2: "Wuling 2",
    wuling3: "Wuling 3",
    custom: "Custom",
  },
} satisfies Record<Language, Record<GradePresetName, string>>;

export const titleColorLabels = {
  zh: {
    white: "白色",
    black: "黑色",
    custom: "自定义颜色",
    contrast: "反差",
  },
  en: {
    white: "White",
    black: "Black",
    custom: "Custom color",
    contrast: "Contrast",
  },
} satisfies Record<Language, Record<TitleColorMode, string>>;

export const exportPhaseLabels = {
  zh: {
    idle: "等待导出",
    "preparing-still": "正在准备静帧",
    "rendering-motion": "正在渲染动态影像",
    "encoding-gif": "正在编码 GIF",
    "packaging-live-photo": "正在打包 .livp",
    downloading: "正在下载",
    done: "导出完成",
    failed: "导出失败",
  },
  en: {
    idle: "Ready to export",
    "preparing-still": "Preparing still",
    "rendering-motion": "Rendering motion",
    "encoding-gif": "Encoding GIF",
    "packaging-live-photo": "Packaging .livp",
    downloading: "Downloading",
    done: "Export complete",
    failed: "Export failed",
  },
} satisfies Record<Language, Record<ExportPhase, string>>;

export function t(language: Language, key: LabelKey): string {
  return labels[language][key];
}
