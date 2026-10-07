import { useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { isTextReadable } from '@/utils/color.utils';
import type { BrandPalette, PaletteRole } from '@/utils/color.utils';
import { useEntrance } from '@/hooks/useEntrance';
import { useMagneticGroup } from '@/hooks/useMagneticGroup';
import { useReveal } from '@/hooks/useReveal';
import TypographyPreview from '@/components/results/TypographyPreview';
import ApplicationPreview from '@/components/results/ApplicationPreview';
import styles from './SectionSystem.module.scss';

/**
 * SectionSystem — the identity as a living system (Section 04).
 *
 * Direction contract (Batch 3 — system, not list):
 *   THESIS:        one forged system, four readings — mark, roles, type,
 *                  applications — in a tabbed canvas that mirrors the
 *                  workspace without duplicating its chrome.
 *   OWN-WORLD:     elevated graphite band (full-bleed surface + hairlines);
 *                  centered head, full-width canvas; color arrives only
 *                  through the live palette.
 *   STORY:         a visitor who trusts the engine now sees the breadth of
 *                  what it ships — not swatches, but a system with surfaces
 *                  and contexts.
 *   FIRST VIEWPORT: a scroll chapter below the lab; head and canvas stagger
 *                  in once via scroll reveal, tab switches replay a quiet
 *                  fade-rise.
 *   FORM:          local-state WAI-ARIA tabs (roving focus, arrow/Home/End
 *                  navigation); typography and application readings reuse
 *                  the shipped workspace previews verbatim.
 */

type SystemView = 'brand' | 'colors' | 'typography' | 'applications';

interface SectionSystemProps {
  /** The live system on display (hero MiniForja output or its default). */
  readonly palette: BrandPalette;
}

const SYSTEM_VIEWS: readonly { readonly id: SystemView; readonly label: string }[] = [
  { id: 'brand', label: 'Marca' },
  { id: 'colors', label: 'Colores' },
  { id: 'typography', label: 'Tipografía' },
  { id: 'applications', label: 'Aplicaciones' },
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

const ROLE_HINTS: Record<PaletteRole, string> = {
  primary: 'Rol dominante',
  secondary: 'Acompañante',
  accent: 'Destacados',
  background: 'Base profunda',
  surface: 'Nivel elevado',
};

/**
 * Two-tone geometric mark built from the live primary and accent — the same
 * visual grammar the workspace uses until the brand pipeline generates a
 * real logo.
 *
 * @param {BrandPalette} palette The live system.
 * @returns {JSX.Element} The rendered mark.
 */
function SystemMark({ palette }: { palette: BrandPalette }) {
  return (
    <svg
      className={styles.mark}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M32 6 56 18v28L32 58 8 46V18L32 6Z"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.5"
      />
      <path d="M32 20 44 27v10l-12 7-12-7V27l12-7Z" fill={palette.primary} />
      <circle cx="32" cy="32" r="3.5" fill={palette.accent} />
    </svg>
  );
}

/**
 * Sistema, no lista — tabbed miniature canvas.
 *
 * @param {SectionSystemProps} props The system on display.
 * @returns {JSX.Element} The rendered section.
 */
export default function SectionSystem({ palette }: SectionSystemProps) {
  const { ref, revealed } = useReveal<HTMLDivElement>();
  const [view, setView] = useState<SystemView>('brand');
  const panelEntered = useEntrance(0, view);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const magnetic = useMagneticGroup<HTMLDivElement>();

  const activeIndex = SYSTEM_VIEWS.findIndex((entry) => entry.id === view);

  /**
   * WAI-ARIA tablist keyboard navigation: arrows move between tabs, Home
   * and End jump to the ends, and focus follows the active tab.
   *
   * @param {KeyboardEvent<HTMLDivElement>} event The keydown event.
   * @returns {void}
   */
  const handleTablistKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const isArrow = event.key === 'ArrowRight' || event.key === 'ArrowLeft';
    if (!isArrow && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();

    let nextIndex = activeIndex;
    if (event.key === 'ArrowRight') nextIndex = (activeIndex + 1) % SYSTEM_VIEWS.length;
    if (event.key === 'ArrowLeft')
      nextIndex = (activeIndex - 1 + SYSTEM_VIEWS.length) % SYSTEM_VIEWS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = SYSTEM_VIEWS.length - 1;

    const next = SYSTEM_VIEWS[nextIndex];
    if (next && nextIndex !== activeIndex) {
      setView(next.id);
      tabRefs.current[nextIndex]?.focus();
    } else {
      tabRefs.current[activeIndex]?.focus();
    }
  };

  const onPrimary = isTextReadable('#FFFFFF', palette.primary)
    ? '#FFFFFF'
    : palette.background;

  const paletteStyle = {
    '--brand-primary': palette.primary,
    '--brand-secondary': palette.secondary,
    '--brand-accent': palette.accent,
    '--brand-background': palette.background,
    '--brand-surface': palette.surface,
    '--brand-on-primary': onPrimary,
  } as CSSProperties;

  return (
    <section className={styles.section} aria-labelledby="system-heading">
      <div className={styles.inner} ref={ref} data-revealed={revealed || undefined}>
        <div className={styles.head}>
          <h2 id="system-heading" className={clsx(styles.title, styles.revealItem)} style={{ transitionDelay: '0ms' }}>
            Sistema, no lista
          </h2>
          <p className={clsx(styles.lede, styles.revealItem)} style={{ transitionDelay: '90ms' }}>
            Cinco roles verificados que viven en superficies, tipografía y
            contextos reales. Recorre las cuatro lecturas del sistema que
            forjaste arriba.
          </p>
        </div>

        <div className={clsx(styles.canvas, styles.revealItem)} style={{ transitionDelay: '180ms' }}>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Lecturas del sistema"
            onKeyDown={handleTablistKeyDown}
            onPointerMove={magnetic.onPointerMove}
            onPointerLeave={magnetic.onPointerLeave}
          >
            {SYSTEM_VIEWS.map((entry, index) => {
              const isActive = entry.id === view;
              return (
                <button
                  key={entry.id}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`system-tab-${entry.id}`}
                  aria-selected={isActive}
                  aria-controls={`system-panel-${entry.id}`}
                  tabIndex={isActive ? 0 : -1}
                  className={styles.tab}
                  data-magnetic
                  data-active={isActive || undefined}
                  onClick={() => setView(entry.id)}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>

          <div
            key={view}
            className={clsx(styles.panel, panelEntered && styles.entered)}
            role="tabpanel"
            id={`system-panel-${view}`}
            aria-labelledby={`system-tab-${view}`}
          >
            {view === 'brand' && (
              <div className={styles.brandView}>
                <span className={styles.markTile} aria-hidden="true">
                  <SystemMark palette={palette} />
                </span>
                <p className={styles.brandEyebrow}>Marca generada · Contraste AA</p>
                <p className={styles.brandName}>Identidad de marca</p>
                <p className={styles.brandTagline}>
                  Sistema cromático verificado bajo WCAG 2.1 AA, forjado de
                  forma determinista.
                </p>
                <ul className={styles.brandStrip} aria-label="Paleta del sistema">
                  {ROLE_ORDER.map((role) => (
                    <li key={role} className={styles.brandStripItem}>
                      <span
                        className={styles.brandSwatch}
                        style={{ backgroundColor: palette[role] }}
                        aria-hidden="true"
                      />
                      <span className={styles.brandStripLabel}>{ROLE_LABELS[role]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {view === 'colors' && (
              <ul className={styles.ladder} aria-label="Sistema cromático">
                {ROLE_ORDER.map((role) => {
                  const hex = palette[role];
                  const isReadable =
                    role !== 'background' && role !== 'surface';
                  const readable = isTextReadable(hex, palette.surface);
                  return (
                    <li key={role} className={styles.ladderItem}>
                      <span
                        className={styles.ladderSwatch}
                        style={{ backgroundColor: hex }}
                        aria-hidden="true"
                      />
                      <span className={styles.ladderRole}>
                        <span className={styles.ladderName}>{ROLE_LABELS[role]}</span>
                        <span className={styles.ladderHint}>{ROLE_HINTS[role]}</span>
                      </span>
                      <code className={styles.ladderHex}>{hex}</code>
                      {isReadable && (
                        <span
                          className={styles.aaBadge}
                          data-pass={readable || undefined}
                          title={
                            readable
                              ? 'Cumple contraste AA (≥ 4.5:1)'
                              : 'No alcanza contraste AA sobre la superficie'
                          }
                        >
                          {readable ? (
                            <Check size={12} aria-hidden="true" />
                          ) : (
                            <span className={styles.aaDot} aria-hidden="true" />
                          )}
                          AA
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {view === 'typography' && <TypographyPreview style={paletteStyle} />}

            {view === 'applications' && <ApplicationPreview style={paletteStyle} />}
          </div>
        </div>
      </div>
    </section>
  );
}
