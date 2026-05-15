import type { EasingName } from "../types";
import { clamp } from "./math";

export function easingValue(name: EasingName, value: number): number {
  const t = clamp(value, 0, 1);

  if (name === "linear") {
    return t;
  }

  if (name === "cinematic") {
    return t * t * (3 - 2 * t);
  }

  return 0.5 - Math.cos(Math.PI * t) / 2;
}
