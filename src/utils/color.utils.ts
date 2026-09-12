import { colord } from 'colord';
import type {
  HarmonyType,
  LightnessProfile,
  QuizAnswer,
  SaturationLevel,
} from '@/data/quizDictionary';

/**
 * Color Generation Engine — multi-dimensional, deterministic palette math.
 *
 * Consumes the questionnaire's weighted color directive (base hue, hue shift,
 * chroma score, value score, harmony vote) and derives a balanced five-role
 * brand identity in HSL space. Every readable role is verified against the
 * generated surface with a WCAG 2.1 AA contrast pass in both light and dark
 * families. All functions are pure, with no DOM access or side effects, so
 * they stay testable and safe to call from Zustand.
 */

/** The semantic roles that compose a generated brand palette. */
export type PaletteRole =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'background'
  | 'surface';

/** A complete, contrast-verified brand palette. All values are uppercase HEX. */
export interface BrandPalette {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
  readonly background: string;
  readonly surface: string;
}

/** Ordered roles — also the render order for palette surfaces. */
export const PALETTE_ROLES: readonly PaletteRole[] = [
  'primary',
  'secondary',
  'accent',
  'background',
  'surface',
] as const;

/**
 * The aggregated color intent distilled from a set of quiz answers.
 * A single, normalized vector the forging math can consume directly.
 */
export interface ColorDirective {
  /** Deterministic hue (0–360) hashed from the chosen archetypes. */
  readonly baseHue: number;
  /** Accumulated degrees (−360…+360) voted by the chosen options. */
  readonly hueShift: number;
  /** Chroma intent, 0 (pastel washes) → 1 (full neon glow). */
  readonly saturationScore: number;
  /** Value intent, 0 (deep obsidian) → 1 (luminous light mode). */
  readonly lightnessScore: number;
  /** Winning hue relationship between secondary, accent and primary. */
  readonly harmonyType: HarmonyType;
}

/** WCAG 2.1 AA threshold for normal-sized text. */
const AA_TEXT_CONTRAST = 4.5;

/** Maximum lightness correction passes before giving up on a pair. */
const MAX_CONTRAST_PASSES = 24;

/** Lightness delta applied per contrast pass. */
const CONTRAST_STEP = 0.045;

/** Fallback seed used when an input color cannot be parsed. */
const FALLBACK_SEED = '#6366f1';

/**
 * Chroma votes — each `SaturationLevel` contributes its weight to the
 * averaged saturation score that drives the final chroma percentage.
 */
const SATURATION_WEIGHTS: Readonly<Record<SaturationLevel, number>> = {
  neon: 1,
  vibrant: 0.78,
  balanced: 0.52,
  muted: 0.3,
  pastel: 0.14,
};

/**
 * Value votes — each `LightnessProfile` contributes its weight to the
 * averaged lightness score that selects the surface family and role bands.
 */
const LIGHTNESS_WEIGHTS: Readonly<Record<LightnessProfile, number>> = {
  deep: 0,
  dark: 0.25,
  twilight: 0.5,
  illuminated: 0.75,
  light: 1,
};

/**
 * Harmony geometry — hue offsets (in degrees) for the secondary and accent
 * roles relative to the resolved primary hue. Monochromatic keeps every role
 * on one hue and separates them purely through chroma and value.
 */
const HARMONY_OFFSETS: Readonly<
  Record<HarmonyType, { secondary: number; accent: number }>
> = {
  monochromatic: { secondary: 0, accent: 0 },
  analogous: { secondary: 32, accent: -34 },
  complementary: { secondary: 22, accent: 170 },
  'split-complementary': { secondary: 20, accent: 150 },
  triadic: { secondary: 120, accent: 240 },
};

/**
 * Clamps a number into the inclusive [min, max] range.
 *
 * @param {number} value The value to clamp.
 * @param {number} min The lower bound.
 * @param {number} max The upper bound.
 * @returns {number} The clamped value.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Wraps a hue into the canonical [0, 360) range.
 *
 * @param {number} hue The raw hue in degrees.
 * @returns {number} The wrapped hue.
 */
function wrapHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

/**
 * Linear interpolation between two values.
 *
 * @param {number} from The value at t = 0.
 * @param {number} to The value at t = 1.
 * @param {number} t The interpolation parameter.
 * @returns {number} The interpolated value.
 */
function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * FNV-1a 32-bit hash of a string — tiny, deterministic, and stable across
 * runs. Used to derive the base hue from the chosen archetypes.
 *
 * @param {string} tokens The string to hash.
 * @returns {number} An unsigned 32-bit hash.
 */
function fnv1a(tokens: string): number {
  let hash = 2166136261;
  for (let i = 0; i < tokens.length; i += 1) {
    hash ^= tokens.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Distills a set of quiz answers into a single `ColorDirective`.
 *
 * The base hue is the FNV-1a hash of the chosen archetypes; the hue shift is
 * the sum of voted degrees; saturation and lightness scores are arithmetic
 * means of the weighted votes; the harmony is a plurality vote with a
 * first-seen tie-break. Pure and deterministic.
 *
 * An empty answer set yields a neutral directive mirroring the fallback
 * seed's temperament.
 *
 * @param {readonly QuizAnswer[]} answers The collected answers, in order.
 * @returns {ColorDirective} The aggregated generation directive.
 */
export function resolveColorDirective(
  answers: readonly QuizAnswer[],
): ColorDirective {
  if (answers.length === 0) {
    return {
      baseHue: colord(FALLBACK_SEED).toHsl().h,
      hueShift: 0,
      saturationScore: SATURATION_WEIGHTS.balanced,
      lightnessScore: LIGHTNESS_WEIGHTS.dark,
      harmonyType: 'analogous',
    };
  }

  const baseHue = fnv1a(answers.map((a) => a.archetype).join('|')) % 360;
  const hueShift = answers.reduce((sum, answer) => sum + answer.hueShift, 0);

  const saturationScore =
    answers.reduce(
      (sum, answer) => sum + SATURATION_WEIGHTS[answer.saturationLevel],
      0,
    ) / answers.length;

  const lightnessScore =
    answers.reduce(
      (sum, answer) => sum + LIGHTNESS_WEIGHTS[answer.lightnessProfile],
      0,
    ) / answers.length;

  const tally = new Map<HarmonyType, number>();
  for (const answer of answers) {
    tally.set(answer.harmonyType, (tally.get(answer.harmonyType) ?? 0) + 1);
  }
  let harmonyType: HarmonyType = answers[0].harmonyType;
  let winningCount = 0;
  for (const [candidate, count] of tally) {
    if (count > winningCount) {
      harmonyType = candidate;
      winningCount = count;
    }
  }

  return { baseHue, hueShift, saturationScore, lightnessScore, harmonyType };
}

/**
 * Computes the WCAG 2.1 relative luminance of a color (0 to 1).
 *
 * Channels are linearized per the WCAG formula, then combined with the
 * standard sRGB coefficients.
 *
 * @param {string} color The color to measure, in any CSS format.
 * @returns {number} The relative luminance.
 */
function relativeLuminance(color: string): number {
  const { r, g, b } = colord(color).toRgb();

  const linearize = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  };

  return (
    0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
  );
}

/**
 * Computes the WCAG 2.1 contrast ratio between two colors (1 to 21).
 *
 * @param {string} foreground The foreground color in any CSS format.
 * @param {string} background The background color in any CSS format.
 * @returns {number} The contrast ratio, rounded to two decimals.
 */
export function getContrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Reports whether a color pair meets the WCAG 2.1 AA text threshold.
 *
 * @param {string} foreground The text color in any CSS format.
 * @param {string} background The background color in any CSS format.
 * @param {number} [minRatio=4.5] The minimum acceptable ratio.
 * @returns {boolean} `true` when the pair clears the threshold.
 */
export function isTextReadable(
  foreground: string,
  background: string,
  minRatio: number = AA_TEXT_CONTRAST,
): boolean {
  return getContrastRatio(foreground, background) >= minRatio;
}

/**
 * Adjusts a color's lightness until it clears a contrast threshold against a
 * given background. Dark backgrounds lighten the color; light backgrounds
 * darken it. Runs a bounded number of passes and returns the best effort.
 *
 * @param {string} color The color to correct, in any CSS format.
 * @param {string} background The background to verify against.
 * @param {number} [minRatio=4.5] The minimum acceptable contrast ratio.
 * @returns {string} An uppercase HEX color that meets the threshold.
 */
export function ensureTextContrast(
  color: string,
  background: string,
  minRatio: number = AA_TEXT_CONTRAST,
): string {
  const backgroundIsDark = colord(background).isDark();
  let candidate = colord(color);

  for (let pass = 0; pass < MAX_CONTRAST_PASSES; pass += 1) {
    if (getContrastRatio(candidate.toHex(), background) >= minRatio) break;
    candidate = backgroundIsDark
      ? candidate.lighten(CONTRAST_STEP)
      : candidate.darken(CONTRAST_STEP);
  }

  return candidate.toHex().toUpperCase();
}

/**
 * Resolves the surface tones for a directive.
 *
 * The value score selects a dark or light family and interpolates the
 * background/surface tonal step inside it, so mixed value votes slide
 * smoothly between extremes without landing on an unusable mid-gray.
 *
 * @param {ColorDirective} directive The aggregated directive.
 * @returns {{ backgroundL: number; surfaceL: number }} Surface lightness percentages.
 */
function resolveSurfaceLightness(directive: ColorDirective): {
  backgroundL: number;
  surfaceL: number;
} {
  const { lightnessScore } = directive;

  if (lightnessScore <= LIGHTNESS_WEIGHTS.twilight) {
    const t = lightnessScore / LIGHTNESS_WEIGHTS.twilight;
    return { backgroundL: lerp(4, 12, t), surfaceL: lerp(9, 18, t) };
  }

  const t =
    (lightnessScore - LIGHTNESS_WEIGHTS.twilight) /
    (1 - LIGHTNESS_WEIGHTS.twilight);
  return { backgroundL: lerp(84, 93, t), surfaceL: lerp(90, 97, t) };
}

/**
 * Forges a complete five-role brand palette from an aggregated directive.
 *
 * Derivation (all in HSL space, fully deterministic): the primary hue is the
 * base hue plus the accumulated shift, wrapped; chroma maps the saturation
 * score onto a 26–98% band; the value score selects a dark or light surface
 * family carrying a desaturated tint of the primary hue; secondary and accent
 * hues come from the winning harmony's offsets (monochromatic separates roles
 * purely through chroma and value); the three readable roles are corrected
 * against the surface until each clears AA 4.5:1, then nudged apart when a
 * shared hue would otherwise collapse two roles together.
 *
 * @param {ColorDirective} directive The aggregated directive to forge from.
 * @returns {BrandPalette} The verified palette as uppercase HEX values.
 */
export function forgeBrandPalette(directive: ColorDirective): BrandPalette {
  const hue = wrapHue(directive.baseHue + directive.hueShift);
  const saturation = clamp(26 + directive.saturationScore * 72, 26, 98);

  const { backgroundL, surfaceL } = resolveSurfaceLightness(directive);
  const surfaceIsDark = surfaceL < 50;
  const offsets = HARMONY_OFFSETS[directive.harmonyType];

  const roleBaseL = surfaceIsDark ? 54 : 36;

  const primary = colord({ h: hue, s: saturation, l: roleBaseL });

  const secondarySat = directive.harmonyType === 'monochromatic'
    ? saturation * 0.68
    : saturation * 0.88;
  const secondary = colord({
    h: wrapHue(hue + offsets.secondary),
    s: secondarySat,
    l: surfaceIsDark ? roleBaseL - 4 : roleBaseL + 4,
  });

  const accent = colord({
    h: wrapHue(hue + offsets.accent),
    s: Math.min(saturation * 1.06 + 4, 100),
    l: surfaceIsDark ? Math.max(roleBaseL + 8, 62) : Math.min(roleBaseL - 8, 28),
  });

  const background = colord({
    h: hue,
    s: Math.min(saturation * 0.5, 55),
    l: backgroundL,
  });
  const surface = colord({
    h: hue,
    s: Math.min(saturation * 0.4, 46),
    l: surfaceL,
  });

  const verified = {
    primary: ensureTextContrast(primary.toHex(), surface.toHex()),
    secondary: ensureTextContrast(secondary.toHex(), surface.toHex()),
    accent: ensureTextContrast(accent.toHex(), surface.toHex()),
  };

  const distinct = new Set(Object.values(verified));
  let nudge = secondary;
  while (
    distinct.size < 3 &&
    getContrastRatio(nudge.toHex(), surface.toHex()) < 21
  ) {
    nudge = surfaceIsDark ? nudge.darken(0.05) : nudge.lighten(0.05);
    const candidate = ensureTextContrast(nudge.toHex(), surface.toHex());
    if (!Object.values(verified).includes(candidate)) {
      verified.secondary = candidate;
      distinct.add(candidate);
    }
  }

  return {
    primary: verified.primary,
    secondary: verified.secondary,
    accent: verified.accent,
    background: background.toHex().toUpperCase(),
    surface: surface.toHex().toUpperCase(),
  };
}

/**
 * Generates a balanced five-role brand palette from a single seed color.
 *
 * Convenience wrapper kept for seed-only callers: the seed's own hue and
 * chroma are converted into a directive (dark cyber-SaaS family, analogous
 * harmony), then forged through the same multi-dimensional engine.
 *
 * @param {string} baseColor The seed color in any CSS format.
 * @returns {BrandPalette} The verified palette as uppercase HEX values.
 */
export function generateBrandPalette(baseColor: string): BrandPalette {
  const seed = colord(baseColor);
  if (!seed.isValid()) {
    return generateBrandPalette(FALLBACK_SEED);
  }

  const { h, s } = seed.toHsl();

  return forgeBrandPalette({
    baseHue: h,
    hueShift: 0,
    saturationScore: clamp((s - 20) / 75, 0, 1),
    lightnessScore: LIGHTNESS_WEIGHTS.dark,
    harmonyType: 'analogous',
  });
}

/**
 * Generates a complete brand identity directly from the questionnaire
 * answers — the full pipeline: psychology → directive → verified palette.
 *
 * @param {readonly QuizAnswer[]} answers The collected answers, in order.
 * @returns {BrandPalette} The verified palette as uppercase HEX values.
 */
export function generateBrandIdentity(
  answers: readonly QuizAnswer[],
): BrandPalette {
  return forgeBrandPalette(resolveColorDirective(answers));
}
