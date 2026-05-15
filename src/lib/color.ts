import type { GradeState } from "../types";
import { clamp } from "./math";

export type Rgba = [number, number, number, number];
export type Rgb = [number, number, number];

export interface PixelContext {
  y?: number;
  height?: number;
}

function channel(value: number): number {
  return Math.round(clamp(value, 0, 255));
}

export function mixRgb(from: Rgb, to: Rgb, amount: number): Rgb {
  const strength = clamp(amount, 0, 1);

  return from.map((value, index) => channel(value + (to[index] - value) * strength)) as Rgb;
}

function saturationAdjust(pixel: Rgb, amount: number): Rgb {
  const luminance = pixel[0] * 0.2126 + pixel[1] * 0.7152 + pixel[2] * 0.0722;

  return pixel.map((value) => channel(luminance + (value - luminance) * amount)) as Rgb;
}

function contrastAdjust(value: number, amount: number): number {
  const factor = 1 + amount;

  return (value - 128) * factor + 128;
}

function toneAdjust(value: number, luminance: number, grade: GradeState): number {
  let next = value;
  const highlightRange = clamp((luminance - 142) / 113, 0, 1);
  const shadowRange = clamp((118 - luminance) / 118, 0, 1);

  next -= highlightRange * Math.max(0, -grade.highlights) * 46;
  next += highlightRange * Math.max(0, grade.highlights) * 32;
  next -= shadowRange * Math.max(0, -grade.shadows) * 38;
  next += shadowRange * Math.max(0, grade.shadows) * 42;

  return next;
}

export function atmosphereMask(pixel: Rgb, y = 0, height = 1, grade: Pick<GradeState, "hazeDepth" | "hazeFalloff">): number {
  const luminance = (pixel[0] * 0.2126 + pixel[1] * 0.7152 + pixel[2] * 0.0722) / 255;
  const chroma = (Math.max(...pixel) - Math.min(...pixel)) / 255;
  const lowSaturation = 1 - clamp(chroma * 2.6, 0, 1);
  const brightAir = clamp((luminance - 0.36) / 0.56, 0, 1);
  const verticalDistance = 1 - clamp(y / Math.max(1, height), 0, 1);
  const baseMask = lowSaturation * 0.54 + brightAir * 0.28 + verticalDistance * 0.34;
  const falloff = 0.7 + clamp(grade.hazeFalloff, 0, 1) * 0.55;

  return clamp(baseMask * clamp(grade.hazeDepth, 0, 1) * falloff, 0, 1);
}

export function gradePixel(pixel: Rgba, grade: GradeState, context: PixelContext = {}): Rgba {
  if (!grade.enabled || grade.amount <= 0) {
    return pixel;
  }

  const strength = clamp(grade.amount, 0, 1);
  const exposure = grade.exposure * 255;
  const base: Rgb = [pixel[0] + exposure, pixel[1] + exposure, pixel[2] + exposure].map(channel) as Rgb;
  const baseLuminance = base[0] * 0.2126 + base[1] * 0.7152 + base[2] * 0.0722;
  const toned: Rgb = base.map((value) => channel(toneAdjust(value, baseLuminance, grade))) as Rgb;
  const contrastAmount = grade.contrast + grade.dehaze * 0.12 + grade.clarity * 0.1 + grade.texture * 0.05 - grade.diffuseLight * 0.1;
  const contrasted: Rgb = toned.map((value) => channel(contrastAdjust(value, contrastAmount))) as Rgb;
  const sat = saturationAdjust(contrasted, clamp(1 + grade.saturation + grade.vibrance * 0.65, 0, 2));
  const cooled: Rgb = [
    channel(sat[0] - 40 * grade.cooling),
    channel(sat[1] + 14 * grade.cooling),
    channel(sat[2] + 34 * grade.cooling - sat[2] * grade.blueDesaturation * 0.14),
  ];
  const gray = cooled[0] * 0.24 + cooled[1] * 0.56 + cooled[2] * 0.2;
  const industrial: Rgb = [
    channel(cooled[0] + (gray * 0.96 - cooled[0]) * grade.industrialGray),
    channel(cooled[1] + (gray * 1.01 - cooled[1]) * grade.industrialGray),
    channel(cooled[2] + (gray * 1.06 - cooled[2]) * grade.industrialGray),
  ];
  const haze = atmosphereMask(industrial, context.y ?? 0, context.height ?? 1, grade);
  const airlight: Rgb = [190, 218, 224];
  const hazed = mixRgb(industrial, airlight, haze * (0.72 + grade.diffuseLight * 0.22));
  const diffused: Rgb = hazed.map((value) => channel(value + (226 - value) * grade.diffuseLight * (0.08 + haze * 0.16))) as Rgb;
  const lifted: Rgb = [
    channel(diffused[0] + grade.whites * 22 + grade.blacks * 18),
    channel(diffused[1] + grade.whites * 24 + grade.blacks * 18),
    channel(diffused[2] + grade.whites * 28 + grade.blacks * 20),
  ];
  const mixed = mixRgb([pixel[0], pixel[1], pixel[2]], lifted, strength);
  return [mixed[0], mixed[1], mixed[2], pixel[3]];
}

export function applyGradeToImageData(imageData: ImageData, grade: GradeState): ImageData {
  if (!grade.enabled || grade.amount <= 0) {
    return imageData;
  }

  const { data } = imageData;
  const strength = clamp(grade.amount, 0, 1);
  const exposure = grade.exposure * 255;
  const contrastAmount = grade.contrast + grade.dehaze * 0.12 + grade.clarity * 0.1 + grade.texture * 0.05 - grade.diffuseLight * 0.1;
  const saturationAmount = clamp(1 + grade.saturation + grade.vibrance * 0.65, 0, 2);
  const redCooling = 40 * grade.cooling;
  const greenCooling = 14 * grade.cooling;
  const blueCooling = 34 * grade.cooling;
  const blueDesaturation = grade.blueDesaturation * 0.14;
  const redLift = grade.whites * 22 + grade.blacks * 18;
  const greenLift = grade.whites * 24 + grade.blacks * 18;
  const blueLift = grade.whites * 28 + grade.blacks * 20;

  for (let index = 0; index < data.length; index += 4) {
    const pixelIndex = index / 4;
    const y = Math.floor(pixelIndex / imageData.width);
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];

    const baseRed = channel(red + exposure);
    const baseGreen = channel(green + exposure);
    const baseBlue = channel(blue + exposure);
    const baseLuminance = baseRed * 0.2126 + baseGreen * 0.7152 + baseBlue * 0.0722;

    const tonedRed = channel(toneAdjust(baseRed, baseLuminance, grade));
    const tonedGreen = channel(toneAdjust(baseGreen, baseLuminance, grade));
    const tonedBlue = channel(toneAdjust(baseBlue, baseLuminance, grade));

    const contrastedRed = channel(contrastAdjust(tonedRed, contrastAmount));
    const contrastedGreen = channel(contrastAdjust(tonedGreen, contrastAmount));
    const contrastedBlue = channel(contrastAdjust(tonedBlue, contrastAmount));
    const luminance = contrastedRed * 0.2126 + contrastedGreen * 0.7152 + contrastedBlue * 0.0722;

    const saturatedRed = channel(luminance + (contrastedRed - luminance) * saturationAmount);
    const saturatedGreen = channel(luminance + (contrastedGreen - luminance) * saturationAmount);
    const saturatedBlue = channel(luminance + (contrastedBlue - luminance) * saturationAmount);

    const cooledRed = channel(saturatedRed - redCooling);
    const cooledGreen = channel(saturatedGreen + greenCooling);
    const cooledBlue = channel(saturatedBlue + blueCooling - saturatedBlue * blueDesaturation);

    const gray = cooledRed * 0.24 + cooledGreen * 0.56 + cooledBlue * 0.2;
    const industrialRed = channel(cooledRed + (gray * 0.96 - cooledRed) * grade.industrialGray);
    const industrialGreen = channel(cooledGreen + (gray * 1.01 - cooledGreen) * grade.industrialGray);
    const industrialBlue = channel(cooledBlue + (gray * 1.06 - cooledBlue) * grade.industrialGray);
    const haze = atmosphereMask([industrialRed, industrialGreen, industrialBlue], y, imageData.height, grade);
    const airAmount = haze * (0.72 + grade.diffuseLight * 0.22);
    const hazedRed = channel(industrialRed + (190 - industrialRed) * airAmount);
    const hazedGreen = channel(industrialGreen + (218 - industrialGreen) * airAmount);
    const hazedBlue = channel(industrialBlue + (224 - industrialBlue) * airAmount);
    const diffuseBase = grade.diffuseLight * (0.08 + haze * 0.16);

    const diffusedRed = channel(hazedRed + (226 - hazedRed) * diffuseBase);
    const diffusedGreen = channel(hazedGreen + (226 - hazedGreen) * diffuseBase);
    const diffusedBlue = channel(hazedBlue + (226 - hazedBlue) * diffuseBase);

    const liftedRed = channel(diffusedRed + redLift);
    const liftedGreen = channel(diffusedGreen + greenLift);
    const liftedBlue = channel(diffusedBlue + blueLift);

    data[index] = channel(red + (liftedRed - red) * strength);
    data[index + 1] = channel(green + (liftedGreen - green) * strength);
    data[index + 2] = channel(blue + (liftedBlue - blue) * strength);
  }

  return imageData;
}
