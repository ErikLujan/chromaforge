import type { CSSProperties } from 'react';
import { PALETTE_ROLES, isTextReadable } from '@/utils/color.utils';
import type { SavedBrand } from '@/store/useBrandStore';
import TypographyPreview from './TypographyPreview';
import ApplicationPreview from './ApplicationPreview';
import styles from './DeepBrandPreview.module.scss';

/**
 * DeepBrandPreview — the full saved identity system inside one modal body.
 *
 * The shared content of the Deep Preview modal used by both the dashboard and
 * the brand library, keeping the two surfaces from ever drifting apart: a
 * role-labelled swatch grid, the typography and application panels rendered
 * exactly as the Results Workspace published them through the same brand
 * custom properties, plus mono provenance. The wrapper modal stays on each
 * page; this component owns only the body.
 */

const fullDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

/** Spanish labels for the five palette roles, in system order. */
const PALETTE_ROLE_LABELS: Record<(typeof PALETTE_ROLES)[number], string> = {
  primary: 'Primario',
  secondary: 'Secundario',
  accent: 'Acento',
  background: 'Fondo',
  surface: 'Superficie',
};

/** Fallback tones — the monochrome token palette — should a saved row ever lack a role. */
const FALLBACK_TONES = {
  primary: '#e8eaed',
  secondary: '#9aa0ae',
  accent: '#b9bdc7',
  background: '#0a0a0b',
  surface: '#131316',
} as const;

/** Formats an ISO timestamp as a full Spanish date ("12 ago 2026"). */
function formatFullDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return fullDateFormatter.format(date).replace(/\.$/, '');
}

/** Two-digit tone index for previews ("01", "02", …). */
function padTone(index: number): string {
  return String(index).padStart(2, '0');
}

/** Names a swatch by its palette role, falling back to a numbered tone. */
function roleLabel(index: number): string {
  const role = PALETTE_ROLES[index];
  return role ? PALETTE_ROLE_LABELS[role] : `Tono ${padTone(index + 1)}`;
}

/**
 * Maps a saved identity's system-order colors onto the `--brand-*` custom
 * properties consumed by the typography and application previews — the same
 * contract the Results Workspace publishes, so the modal previews the
 * identity exactly as it was generated.
 *
 * @param {SavedBrand} brand The saved identity.
 * @returns {CSSProperties} The brand roles as CSS custom properties.
 */
function buildBrandStyle(brand: SavedBrand): CSSProperties {
  const [primary, secondary, accent, background, surface] = brand.colors;
  const primaryTone = primary ?? FALLBACK_TONES.primary;
  const backgroundTone = background ?? FALLBACK_TONES.background;

  return {
    '--brand-primary': primaryTone,
    '--brand-secondary': secondary ?? FALLBACK_TONES.secondary,
    '--brand-accent': accent ?? FALLBACK_TONES.accent,
    '--brand-background': backgroundTone,
    '--brand-surface': surface ?? FALLBACK_TONES.surface,
    '--brand-on-primary': isTextReadable('#FFFFFF', primaryTone) ? '#FFFFFF' : backgroundTone,
  } as CSSProperties;
}

interface DeepBrandPreviewProps {
  /** The saved identity whose full system is previewed. */
  readonly brand: SavedBrand;
}

/**
 * Deep preview body of a saved identity: the role-labelled color system, the
 * typography specimen and the application mockups, plus mono provenance.
 *
 * @param {DeepBrandPreviewProps} props The preview configuration.
 * @returns {JSX.Element} The rendered brand-system preview.
 */
export default function DeepBrandPreview({ brand }: DeepBrandPreviewProps) {
  return (
    <div className={styles.preview}>
      <p className={styles.previewLead}>
        Sistema de identidad completo de «{brand.name}»: color, tipografía y
        aplicaciones listos para producción.
      </p>

      <section className={styles.previewSection} aria-label="Sistema cromático de la marca">
        <div className={styles.previewSectionHeading}>
          <span className={styles.previewSectionEyebrow}>Color · Sistema cromático</span>
          <h3 className={styles.previewSectionTitle}>Paleta de la marca</h3>
        </div>
        <ul className={styles.previewPalette} aria-label={`Detalle de la paleta de ${brand.name}`}>
          {brand.colors.map((color, index) => (
            <li key={`${color}-${index}`} className={styles.previewItem}>
              <span
                className={styles.previewSwatch}
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className={styles.previewName}>{roleLabel(index)}</span>
              <code className={styles.previewHex}>{color}</code>
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.previewPanel}>
        <TypographyPreview style={buildBrandStyle(brand)} />
      </div>

      <div className={styles.previewPanel}>
        <ApplicationPreview style={buildBrandStyle(brand)} />
      </div>

      <div className={styles.previewMeta}>
        <span>{brand.colors.length} tonos</span>
        <span aria-hidden="true">·</span>
        <span>Guardado el {formatFullDate(brand.created_at)}</span>
      </div>
    </div>
  );
}