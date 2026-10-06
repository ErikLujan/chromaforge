import { forgeBrandPalette } from '@/utils/color.utils';
import type { BrandPalette } from '@/utils/color.utils';
import type {
  HarmonyType,
  LightnessProfile,
  SaturationLevel,
} from '@/data/quizDictionary';

/**
 * Shared instrument defaults for the landing forge surfaces.
 *
 * Single source of truth for the MiniForja controls and every section that
 * needs the same starting system before the instrument's first debounced
 * commit lands. Score maps mirror the engine's saturation and lightness
 * weights so the demo directive speaks the engine's language.
 */

export type ChromaChoice = SaturationLevel;
export type ValueChoice = Extract<LightnessProfile, 'deep' | 'twilight' | 'light'>;

export const DEFAULT_HUE = 232;
export const DEFAULT_CHROMA: ChromaChoice = 'balanced';
export const DEFAULT_VALUE: ValueChoice = 'deep';
export const DEFAULT_HARMONY: HarmonyType = 'analogous';

/** Chroma votes mirror the engine's saturation weights. */
export const SATURATION_SCORES: Record<ChromaChoice, number> = {
  neon: 1,
  vibrant: 0.78,
  balanced: 0.52,
  muted: 0.3,
  pastel: 0.14,
};

/** Value votes mirror the engine's lightness weights. */
export const LIGHTNESS_SCORES: Record<ValueChoice, number> = {
  deep: 0,
  twilight: 0.5,
  light: 1,
};

/**
 * Forges a palette from instrument state through the shipped engine.
 *
 * @param {number} hue The base hue in degrees.
 * @param {ChromaChoice} chroma The chroma intent.
 * @param {ValueChoice} value The surface family intent.
 * @param {HarmonyType} harmony The hue relationship.
 * @returns {BrandPalette} The verified five-role system.
 */
export function forgeInstrumentPalette(
  hue: number,
  chroma: ChromaChoice,
  value: ValueChoice,
  harmony: HarmonyType,
): BrandPalette {
  return forgeBrandPalette({
    baseHue: hue,
    hueShift: 0,
    saturationScore: SATURATION_SCORES[chroma],
    lightnessScore: LIGHTNESS_SCORES[value],
    harmonyType: harmony,
  });
}

/**
 * Forges the instrument's default palette through the shipped engine.
 *
 * @returns {BrandPalette} The default verified five-role system.
 */
export function getDefaultPalette(): BrandPalette {
  return forgeInstrumentPalette(DEFAULT_HUE, DEFAULT_CHROMA, DEFAULT_VALUE, DEFAULT_HARMONY);
}
