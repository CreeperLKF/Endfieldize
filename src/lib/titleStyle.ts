import type { TitleState } from "../types";
import { clamp } from "./math";

export type RgbTuple = [number, number, number];

const WHITE = "#f7f8f5";
const BLACK = "#080a0d";

export function parseHexColor(value: string): RgbTuple | null {
  const normalized = value.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(normalized);
  if (short) {
    return [...short[1]].map((char) => Number.parseInt(`${char}${char}`, 16)) as RgbTuple;
  }

  const full = /^#([0-9a-f]{6})$/i.exec(normalized);
  if (!full) {
    return null;
  }

  return [
    Number.parseInt(full[1].slice(0, 2), 16),
    Number.parseInt(full[1].slice(2, 4), 16),
    Number.parseInt(full[1].slice(4, 6), 16),
  ];
}

export function relativeLuminance([red, green, blue]: RgbTuple): number {
  return (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
}

export function contrastColorForRgb(sample: RgbTuple): string {
  return relativeLuminance(sample) > 0.58 ? BLACK : WHITE;
}

export function resolveTitleColor(title: TitleState, sample?: RgbTuple): string {
  if (title.colorMode === "black") {
    return BLACK;
  }

  if (title.colorMode === "custom") {
    return parseHexColor(title.customColor) ? title.customColor : WHITE;
  }

  if (title.colorMode === "contrast" && sample) {
    return contrastColorForRgb(sample);
  }

  return WHITE;
}

export function titleAlpha(title: Pick<TitleState, "opacity">): number {
  return clamp(title.opacity, 0, 1);
}
