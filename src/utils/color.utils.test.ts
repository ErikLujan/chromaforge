import { describe, expect, it } from 'vitest';
import { colord } from 'colord';
import {
  ensureTextContrast,
  forgeBrandPalette,
  generateBrandIdentity,
  generateBrandPalette,
  getContrastRatio,
  isTextReadable,
  resolveColorDirective,
} from './color.utils';
import type { QuizAnswer } from '@/data/quizDictionary';

describe('getContrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(getContrastRatio('#000000', '#FFFFFF')).toBe(21);
  });

  it('returns 1 for identical colors', () => {
    expect(getContrastRatio('#6366F1', '#6366F1')).toBe(1);
  });

  it('rounds to two decimals', () => {
    const ratio = getContrastRatio('#6366F1', '#FFFFFF');
    expect(Math.round(ratio * 100)).toBe(ratio * 100);
  });
});

describe('isTextReadable', () => {
  it('passes AA for the light text token on the obsidian background', () => {
    expect(isTextReadable('#E8E9ED', '#0B0D12')).toBe(true);
  });

  it('fails AA for the disabled text token on the obsidian background', () => {
    expect(isTextReadable('#3A3E4E', '#0B0D12')).toBe(false);
  });

  it('respects a custom minimum ratio', () => {
    expect(isTextReadable('#696969', '#0B0D12', 3)).toBe(true);
    expect(isTextReadable('#696969', '#0B0D12', 4.5)).toBe(false);
  });
});

describe('ensureTextContrast', () => {
  it('lightens a dark color until it clears AA on a dark background', () => {
    const corrected = ensureTextContrast('#1E1B4B', '#0B0D12');
    expect(getContrastRatio(corrected, '#0B0D12')).toBeGreaterThanOrEqual(4.5);
  });

  it('darkens a light color until it clears AA on a light background', () => {
    const corrected = ensureTextContrast('#E8E9ED', '#FFFFFF');
    expect(getContrastRatio(corrected, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });

  it('returns the color unchanged when it already passes', () => {
    const color = '#E8E9ED';
    expect(ensureTextContrast(color, '#0B0D12')).toBe(color.toUpperCase());
  });

  it('returns uppercase hex', () => {
    expect(ensureTextContrast('#6366f1', '#0B0D12')).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe('generateBrandPalette', () => {
  it('returns a five-role palette of uppercase hex values', () => {
    const palette = generateBrandPalette('#6366F1');
    expect(palette).toEqual({
      primary: expect.stringMatching(/^#[0-9A-F]{6}$/),
      secondary: expect.stringMatching(/^#[0-9A-F]{6}$/),
      accent: expect.stringMatching(/^#[0-9A-F]{6}$/),
      background: expect.stringMatching(/^#[0-9A-F]{6}$/),
      surface: expect.stringMatching(/^#[0-9A-F]{6}$/),
    });
  });

  it('produces three distinct readable roles', () => {
    const palette = generateBrandPalette('#6366F1');
    expect(new Set([palette.primary, palette.secondary, palette.accent]).size).toBe(3);
  });

  it('keeps the background and surface distinct dark tones', () => {
    const palette = generateBrandPalette('#6366F1');
    expect(palette.background).not.toBe(palette.surface);
    expect(getContrastRatio(palette.surface, palette.background)).toBeGreaterThan(1.02);
  });

  it('guarantees every readable role clears AA on the surface', () => {
    for (const seed of ['#6366F1', '#06B6D4', '#F59E0B', '#22C55E', '#EF4444']) {
      const palette = generateBrandPalette(seed);
      for (const role of ['primary', 'secondary', 'accent'] as const) {
        expect(
          getContrastRatio(palette[role], palette.surface),
          `${role} of ${seed} against ${palette.surface}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('is deterministic across calls', () => {
    expect(generateBrandPalette('#06B6D4')).toEqual(generateBrandPalette('#06B6D4'));
  });

  it('falls back to a known palette for an invalid seed', () => {
    expect(generateBrandPalette('not-a-color')).toEqual(generateBrandPalette('#6366F1'));
  });
});

/**
 * Minimal answer fixture carrying only the directive-relevant payload.
 */
function answer(partial: {
  archetype: string;
  hueShift?: number;
  saturationLevel: QuizAnswer['saturationLevel'];
  lightnessProfile: QuizAnswer['lightnessProfile'];
  harmonyType: QuizAnswer['harmonyType'];
}): QuizAnswer {
  return {
    questionId: 'q',
    optionId: partial.archetype,
    tags: [],
    hueShift: partial.hueShift ?? 0,
    ...partial,
  };
}

describe('resolveColorDirective', () => {
  it('averages mixed saturation votes between their extremes', () => {
    const directive = resolveColorDirective([
      answer({ archetype: 'a', saturationLevel: 'neon', lightnessProfile: 'dark', harmonyType: 'analogous' }),
      answer({ archetype: 'b', saturationLevel: 'pastel', lightnessProfile: 'dark', harmonyType: 'analogous' }),
    ]);
    expect(directive.saturationScore).toBeGreaterThan(0.14);
    expect(directive.saturationScore).toBeLessThan(1);
  });

  it('resolves the harmony by plurality vote', () => {
    const directive = resolveColorDirective([
      answer({ archetype: 'a', saturationLevel: 'balanced', lightnessProfile: 'dark', harmonyType: 'triadic' }),
      answer({ archetype: 'b', saturationLevel: 'balanced', lightnessProfile: 'dark', harmonyType: 'triadic' }),
      answer({ archetype: 'c', saturationLevel: 'balanced', lightnessProfile: 'dark', harmonyType: 'monochromatic' }),
    ]);
    expect(directive.harmonyType).toBe('triadic');
  });

  it('is deterministic for the same answers', () => {
    const answers = [
      answer({ archetype: 'sage', saturationLevel: 'muted', lightnessProfile: 'twilight', harmonyType: 'complementary' }),
    ];
    expect(resolveColorDirective(answers)).toEqual(resolveColorDirective(answers));
  });
});

describe('generateBrandIdentity — multi-dimensional variety', () => {
  it('produces softer chroma for muted answers than vibrant ones on the same seed psychology', () => {
    const base = { lightnessProfile: 'twilight', harmonyType: 'analogous' } as const;
    const muted = generateBrandIdentity([
      answer({ archetype: 'calm', saturationLevel: 'muted', ...base }),
    ]);
    const neon = generateBrandIdentity([
      answer({ archetype: 'calm', saturationLevel: 'neon', ...base }),
    ]);
    expect(colord(muted.primary).toHsl().s).toBeLessThan(
      colord(neon.primary).toHsl().s - 20,
    );
  });

  it('switches to a light surface family for illuminated profiles', () => {
    const palette = generateBrandIdentity([
      answer({
        archetype: 'dawn',
        saturationLevel: 'pastel',
        lightnessProfile: 'light',
        harmonyType: 'analogous',
      }),
    ]);
    expect(colord(palette.background).isDark()).toBe(false);
    expect(colord(palette.surface).isDark()).toBe(false);
  });

  it('keeps deep obsidian surfaces for deep profiles', () => {
    const palette = generateBrandIdentity([
      answer({
        archetype: 'midnight',
        saturationLevel: 'neon',
        lightnessProfile: 'deep',
        harmonyType: 'split-complementary',
      }),
    ]);
    expect(colord(palette.background).toHsl().l).toBeLessThan(10);
    expect(colord(palette.surface).toHsl().l).toBeLessThan(15);
  });

  it('applies harmony geometry to the accent hue', () => {
    const forge = (harmony: QuizAnswer['harmonyType']) =>
      generateBrandIdentity([
        answer({
          archetype: 'probe',
          saturationLevel: 'vibrant',
          lightnessProfile: 'dark',
          harmonyType: harmony,
        }),
      ]);

    const monoAccent = colord(forge('monochromatic').accent).toHsl().h;
    const triadicAccent = colord(forge('triadic').accent).toHsl().h;

    const delta = (((triadicAccent - monoAccent) % 360) + 360) % 360;
    expect(delta).toBeGreaterThan(90);
  });

  it('guarantees AA contrast for every readable role across the full payload space', () => {
    const saturations = ['pastel', 'muted', 'balanced', 'vibrant', 'neon'] as const;
    const lightnesses = ['deep', 'dark', 'twilight', 'illuminated', 'light'] as const;
    const harmonies = [
      'monochromatic',
      'analogous',
      'complementary',
      'split-complementary',
      'triadic',
    ] as const;

    let checked = 0;
    for (const saturationLevel of saturations) {
      for (const lightnessProfile of lightnesses) {
        for (const harmonyType of harmonies) {
          const palette = generateBrandIdentity([
            answer({ archetype: `probe-${checked}`, saturationLevel, lightnessProfile, harmonyType }),
          ]);
          for (const role of ['primary', 'secondary', 'accent'] as const) {
            expect(
              getContrastRatio(palette[role], palette.surface),
              `${role} · ${saturationLevel}/${lightnessProfile}/${harmonyType}`,
            ).toBeGreaterThanOrEqual(4.5);
          }
          expect(new Set([palette.primary, palette.secondary, palette.accent]).size).toBe(3);
          checked += 1;
        }
      }
    }
    expect(checked).toBe(125);
  });

  it('is deterministic across identical answer sets', () => {
    const answers = [
      answer({ archetype: 'magician', saturationLevel: 'neon', lightnessProfile: 'deep', harmonyType: 'split-complementary' }),
      answer({ archetype: 'sage', hueShift: 12, saturationLevel: 'muted', lightnessProfile: 'dark', harmonyType: 'complementary' }),
    ];
    expect(generateBrandIdentity(answers)).toEqual(generateBrandIdentity(answers));
  });
});

describe('forgeBrandPalette — direct math contract', () => {
  it('keeps background and surface as distinct tonal steps in both families', () => {
    for (const lightnessScore of [0.05, 0.45, 0.55, 0.95]) {
      const palette = forgeBrandPalette({
        baseHue: 210,
        hueShift: 0,
        saturationScore: 0.5,
        lightnessScore,
        harmonyType: 'analogous',
      });
      expect(palette.background).not.toBe(palette.surface);
      expect(getContrastRatio(palette.surface, palette.background)).toBeGreaterThan(1.02);
    }
  });
});