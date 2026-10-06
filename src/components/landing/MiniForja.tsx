import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getContrastRatio, isTextReadable } from '@/utils/color.utils';
import type { BrandPalette, PaletteRole } from '@/utils/color.utils';
import type { HarmonyType } from '@/data/quizDictionary';
import {
  DEFAULT_HUE,
  forgeInstrumentPalette,
  getDefaultPalette,
} from './forjaDefaults';
import type { ChromaChoice, ValueChoice } from './forjaDefaults';
import styles from './MiniForja.module.scss';

/**
 * MiniForja — live seed-to-system demonstrator for the Home hero.
 *
 * Direction contract (Section 01 — Hero-forja):
 *   THESIS:        the landing proves instead of promising — a guest forges
 *                  a real five-role system with the shipped engine, no
 *                  account, no wizard, same input always yielding the same
 *                  output.
 *   OWN-WORLD:     monochrome instrument panel (glass, hairlines, mono
 *                  readouts); every hue on screen comes from the forged
 *                  palette itself.
 *   STORY:         a visitor drags one hue, feels the system respond, reads
 *                  the AA verdict, and reaches for the questionnaire with
 *                  trust already earned.
 *   FIRST VIEWPORT: right column of the asymmetric hero (5 of 12 cols);
 *                  stacked below the copy on mobile with zero overflow.
 *   FORM:          local-state instrument — `forgeBrandPalette` on a
 *                  debounced directive commit; the live primary is lifted
 *                  to the hero so the aurora echoes it.
 */

interface MiniForjaProps {
  /** Receives every forged palette so the hero background can echo it. */
  readonly onPaletteChange?: (palette: BrandPalette) => void;
}

const CHROMA_OPTIONS: readonly { readonly id: ChromaChoice; readonly label: string }[] = [
  { id: 'pastel', label: 'Pastel' },
  { id: 'muted', label: 'Sutil' },
  { id: 'balanced', label: 'Equilibrado' },
  { id: 'vibrant', label: 'Vibrante' },
  { id: 'neon', label: 'Neón' },
] as const;

const VALUE_OPTIONS: readonly { readonly id: ValueChoice; readonly label: string }[] = [
  { id: 'deep', label: 'Obsidiana' },
  { id: 'twilight', label: 'Crepúsculo' },
  { id: 'light', label: 'Luminoso' },
] as const;

const HARMONY_OPTIONS: readonly { readonly id: HarmonyType; readonly label: string }[] = [
  { id: 'monochromatic', label: 'Monocromático' },
  { id: 'analogous', label: 'Análogo' },
  { id: 'complementary', label: 'Complementario' },
  { id: 'split-complementary', label: 'Dividido' },
  { id: 'triadic', label: 'Triádico' },
] as const;

const ROLE_ORDER: readonly PaletteRole[] = [
  'primary',
  'secondary',
  'accent',
  'background',
  'surface',
] as const;

const ROLE_LABELS: Record<PaletteRole, string> = {
  primary: 'Primario',
  secondary: 'Secundario',
  accent: 'Acento',
  background: 'Fondo',
  surface: 'Superficie',
};

/** Roles verified as text against the surface. */
const READABLE_ROLES: readonly PaletteRole[] = ['primary', 'secondary', 'accent'] as const;

const FORGE_DEBOUNCE_MS = 120;

/**
 * Live MiniForja instrument.
 *
 * @param {MiniForjaProps} props The instrument configuration.
 * @returns {JSX.Element} The rendered instrument panel.
 */
export default function MiniForja({ onPaletteChange }: MiniForjaProps) {
  const [hue, setHue] = useState(DEFAULT_HUE);
  const [chroma, setChroma] = useState<ChromaChoice>('balanced');
  const [value, setValue] = useState<ValueChoice>('deep');
  const [harmony, setHarmony] = useState<HarmonyType>('analogous');
  const [palette, setPalette] = useState<BrandPalette>(getDefaultPalette);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const forged = forgeInstrumentPalette(hue, chroma, value, harmony);
      setPalette(forged);
      onPaletteChange?.(forged);
    }, FORGE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [hue, chroma, value, harmony, onPaletteChange]);

  /**
   * Copies a role HEX to the clipboard.
   *
   * @param {string} hex The uppercase HEX value to copy.
   * @returns {Promise<void>}
   */
  const copyHex = async (hex: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(hex);
      toast.success(`${hex} copiado.`);
    } catch {
      toast.error('No se pudo copiar el valor.');
    }
  };

  const primaryRatio = getContrastRatio(palette.primary, palette.surface);
  const primaryReadable = isTextReadable(palette.primary, palette.surface);

  return (
    <section className={styles.panel} aria-label="Mini-forja interactiva">
      <header className={styles.head}>
        <span className={styles.kicker}>Forja en vivo</span>
        <p className={styles.note}>
          Motor real · sin cuenta · misma entrada, mismo sistema
        </p>
      </header>

      <div className={styles.controls}>
        <div className={styles.hueRow}>
          <label className={styles.label} htmlFor="miniforja-hue">
            Tono
            <span className={styles.hueValue}>{hue}°</span>
          </label>
          <input
            id="miniforja-hue"
            className={styles.slider}
            type="range"
            min={0}
            max={360}
            step={1}
            value={hue}
            aria-valuetext={`${hue} grados`}
            onChange={(event) => setHue(Number(event.target.value))}
          />
        </div>

        <div className={styles.group}>
          <span className={styles.label} id="miniforja-chroma-label">
            Intensidad
          </span>
          <div
            className={styles.segmented}
            role="group"
            aria-labelledby="miniforja-chroma-label"
          >
            {CHROMA_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={styles.segment}
                aria-pressed={chroma === option.id}
                data-active={chroma === option.id || undefined}
                onClick={() => setChroma(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.label} id="miniforja-value-label">
            Superficie
          </span>
          <div
            className={styles.segmented}
            role="group"
            aria-labelledby="miniforja-value-label"
          >
            {VALUE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={styles.segment}
                aria-pressed={value === option.id}
                data-active={value === option.id || undefined}
                onClick={() => setValue(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.harmonyRow}>
          <label className={styles.label} htmlFor="miniforja-harmony">
            Armonía
          </label>
          <select
            id="miniforja-harmony"
            className={styles.select}
            value={harmony}
            onChange={(event) => setHarmony(event.target.value as HarmonyType)}
          >
            {HARMONY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ul className={styles.swatches} aria-label="Sistema generado">
        {ROLE_ORDER.map((role) => {
          const hex = palette[role];
          const isReadable = READABLE_ROLES.includes(role);
          const readable = isTextReadable(hex, palette.surface);
          return (
            <li key={role} className={styles.swatchItem}>
              <button
                type="button"
                className={styles.swatchButton}
                onClick={() => void copyHex(hex)}
                title={`Copiar ${hex}`}
                aria-label={`${ROLE_LABELS[role]} ${hex}${isReadable ? (readable ? ', contraste AA superado' : ', no alcanza contraste AA') : ''}. Activar para copiar.`}
              >
                <span
                  className={styles.swatch}
                  style={{ backgroundColor: hex }}
                  aria-hidden="true"
                />
                <span className={styles.swatchRole}>{ROLE_LABELS[role]}</span>
                <code className={styles.swatchHex}>{hex}</code>
                {isReadable ? (
                  <span
                    className={styles.aaDot}
                    data-pass={readable || undefined}
                    aria-hidden="true"
                  />
                ) : (
                  <span className={styles.baseTag} aria-hidden="true">
                    base
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className={styles.verdict} role="status">
        Primario sobre superficie · {primaryRatio.toFixed(2)}:1 ·{' '}
        {primaryReadable ? 'AA superado' : 'sin AA'}
      </p>
    </section>
  );
}
