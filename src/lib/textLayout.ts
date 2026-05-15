import type { TitleState } from "../types";

export interface TitleLayout {
  x: number;
  y: number;
  align: CanvasTextAlign;
  titleSize: number;
  subtitleSize: number;
  codeSize: number;
}

export function getTitleLayout(title: TitleState, width: number, height: number): TitleLayout {
  const margin = Math.max(32, width * title.safeMargin);
  const offsetX = title.offsetX * width;
  const offsetY = title.offsetY * height;
  const titleSize = Math.max(46, width * 0.085 * title.scale);
  const subtitleSize = Math.max(13, titleSize * 0.18);
  const codeSize = Math.max(11, titleSize * 0.14);

  if (title.position === "center") {
    return {
      x: width / 2 + offsetX,
      y: height / 2 + titleSize * 0.18 + offsetY,
      align: "center",
      titleSize,
      subtitleSize,
      codeSize,
    };
  }

  if (title.position === "lower-right") {
    return {
      x: width - margin + offsetX,
      y: height - margin - titleSize * 0.9 + offsetY,
      align: title.alignment === "center" ? "center" : "right",
      titleSize,
      subtitleSize,
      codeSize,
    };
  }

  if (title.position === "top-left") {
    return {
      x: margin + offsetX,
      y: margin + titleSize + offsetY,
      align: title.alignment,
      titleSize,
      subtitleSize,
      codeSize,
    };
  }

  if (title.position === "center-left") {
    return {
      x: margin + offsetX,
      y: height * 0.5 + offsetY,
      align: title.alignment,
      titleSize,
      subtitleSize,
      codeSize,
    };
  }

  return {
    x: margin + offsetX,
    y: height - margin - titleSize * 0.9 + offsetY,
    align: title.alignment,
    titleSize,
    subtitleSize,
    codeSize,
  };
}
