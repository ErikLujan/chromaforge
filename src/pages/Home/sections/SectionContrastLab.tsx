import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Check, TriangleAlert } from 'lucide-react';
import {
  ensureTextContrast,
  getContrastRatio,
  isTextReadable,
} from '@/utils/color.utils';
import type { BrandPalette, PaletteRole } from '@/utils/color.utils';
import { useMagneticGroup } from '@/hooks/useMagneticGroup';
import { useReveal } from '@/hooks/useReveal';
import styles from './SectionContrastLab.module.scss';

/**
 * SectionContrastLab — algorithmic accessibility workbench (Section 03).
 *
 * Direction contract (Batch 2 — trust, demonstrated):
 *   THESIS:        founders fear unreadable generated palettes — the lab
 *                  answers with the visitor's own live system, not a claim.
 *   OWN-WORLD:     split workbench — monochrome role pickers left, living
 *                  specimen right; the pair under test owns every hue.
 *   STORY:         a visitor swaps text and surface roles, reads the WCAG
 *                  ratio, flips the correction switch, and watches the
 *                  engine lift a failing pair past 4.5:1.
 *   FIRST VIEWPORT: a scroll chapter below the ledger; panels stagger in
 *                  once via scroll reveal.
 *   FORM:          local-state instrument — `getContrastRatio` for the
 *                  verdict, `ensureTextContrast` for the correction; the
 *                  specimen CTA is a real route into the questionnaire.
 */

type ForegroundRole = Extract<PaletteRole, 'primary' | 'secondary' | 'accent'>;
type SurfaceRole = Extract<PaletteRole, 'surface' | 'background'>;

interface SectionContrastLabProps {
  /** The live system under test (hero MiniForja output or its default). */
  readonly palette: BrandPalette;
}

const FOREGROUND_OPTIONS: readonly { readonly id: ForegroundRole; readonly label: string }[] = [
  { id: 'primary', label: 'Primario' },
  { id: 'secondary', label: 'Secundario' },
  { id: 'accent', label: 'Acento' },
] as const;

const SURFACE_OPTIONS: readonly { readonly id: SurfaceRole; readonly label: string }[] = [
  { id: 'surface', label: 'Superficie' },
  { id: 'background', label: 'Fondo' },
] as const;

/**
 * Laboratorio de contraste AA — live workbench.
 *
 * @param {SectionContrastLabProps} props The system under test.
 * @returns {JSX.Element} The rendered workbench section.
 */
export default function SectionContrastLab({ palette }: SectionContrastLabProps) {
  const { ref, revealed } = useReveal<HTMLDivElement>();
  const magnetic = useMagneticGroup<HTMLDivElement>();

  const [foreground, setForeground] = useState<ForegroundRole>('primary');
  const [surface, setSurface] = useState<SurfaceRole>('surface');
  const [correct, setCorrect] = useState(false);

  const foregroundHex = palette[foreground];
  const surfaceHex = palette[surface];

  const rawRatio = getContrastRatio(foregroundHex, surfaceHex);
  const shownHex = correct ? ensureTextContrast(foregroundHex, surfaceHex) : foregroundHex;
  const shownRatio = getContrastRatio(shownHex, surfaceHex);
  const passes = isTextReadable(shownHex, surfaceHex);
  const wasCorrected = shownHex !== foregroundHex;

  return (
    <section className={styles.section} aria-labelledby="contrast-heading">
      <div className={styles.inner} ref={ref} data-revealed={revealed || undefined}>
        <div className={styles.block}>
          <h2 id="contrast-heading" className={clsx(styles.title, styles.revealItem)} style={{ transitionDelay: '0ms' }}>
            Accesibilidad verificada, no prometida
          </h2>
          <p className={clsx(styles.lede, styles.revealItem)} style={{ transitionDelay: '90ms' }}>
            Cada rol legible se corrige contra su superficie antes de liberarse.
            Compruébalo con el sistema que forjaste arriba: cambia los roles y
            activa la corrección.
          </p>
        </div>

        <div className={styles.workbench}>
          <div
            className={clsx(styles.controls, styles.revealItem)}
            style={{ transitionDelay: '180ms' }}
          >
            <div className={styles.group}>
              <span className={styles.label} id="contrast-fg-label">
                Texto
              </span>
              <div
                className={styles.roleList}
                role="group"
                aria-labelledby="contrast-fg-label"
                onPointerMove={magnetic.onPointerMove}
                onPointerLeave={magnetic.onPointerLeave}
              >
                {FOREGROUND_OPTIONS.map((option) => {
                  const isActive = foreground === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={styles.roleButton}
                      data-magnetic
                      aria-pressed={isActive}
                      data-active={isActive || undefined}
                      onClick={() => setForeground(option.id)}
                    >
                      <span
                        className={styles.roleDot}
                        style={{ backgroundColor: palette[option.id] }}
                        aria-hidden="true"
                      />
                      <span className={styles.roleLabel}>{option.label}</span>
                      <code className={styles.roleHex}>{palette[option.id]}</code>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.group}>
              <span className={styles.label} id="contrast-surface-label">
                Superficie
              </span>
              <div
                className={styles.roleList}
                role="group"
                aria-labelledby="contrast-surface-label"
                onPointerMove={magnetic.onPointerMove}
                onPointerLeave={magnetic.onPointerLeave}
              >
                {SURFACE_OPTIONS.map((option) => {
                  const isActive = surface === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={styles.roleButton}
                      data-magnetic
                      aria-pressed={isActive}
                      data-active={isActive || undefined}
                      onClick={() => setSurface(option.id)}
                    >
                      <span
                        className={styles.roleDot}
                        style={{ backgroundColor: palette[option.id] }}
                        aria-hidden="true"
                      />
                      <span className={styles.roleLabel}>{option.label}</span>
                      <code className={styles.roleHex}>{palette[option.id]}</code>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.switchRow}>
              <div className={styles.switchText}>
                <span className={styles.switchLabel} id="contrast-correct-label">
                  Corregir a AA
                </span>
                <span className={styles.switchHint}>
                  {correct
                    ? 'Corrección activada.'
                    : 'El motor ajusta la luminosidad hasta superar 4.5:1.'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={correct}
                aria-labelledby="contrast-correct-label"
                className={styles.switch}
                data-on={correct || undefined}
                onClick={() => setCorrect((value) => !value)}
              >
                <span className={styles.switchKnob} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            className={clsx(styles.specimen, styles.revealItem)}
            style={{ transitionDelay: '270ms', backgroundColor: surfaceHex }}
          >
            <p className={styles.specimenCaption} style={{ color: shownHex }}>
              Espécimen en vivo
            </p>
            <h3 className={styles.specimenTitle} style={{ color: shownHex }}>
              La marca se lee antes de verse
            </h3>
            <p className={styles.specimenBody} style={{ color: shownHex }}>
              Un titular, un párrafo y una acción vestidos con el par que
              elegiste. Si el par falla, lo ves aquí — no en producción.
            </p>
            <Link
              to="/quiz"
              className={styles.specimenCta}
              style={{ backgroundColor: shownHex, color: surfaceHex }}
            >
              Comenzar cuestionario
            </Link>
            <div className={styles.readout} role="status">
              <span className={styles.ratio} style={{ color: shownHex }}>
                {shownRatio.toFixed(2)}:1
              </span>
              <span
                className={styles.aaPill}
                data-pass={passes || undefined}
                style={
                  passes
                    ? undefined
                    : { color: shownHex, borderColor: shownHex }
                }
              >
                {passes ? (
                  <Check size={12} aria-hidden="true" />
                ) : (
                  <TriangleAlert size={12} aria-hidden="true" />
                )}
                {passes ? 'Supera AA' : 'Sin AA'}
              </span>
              {wasCorrected && (
                <span className={styles.delta} style={{ color: shownHex }}>
                  Sin corregir {rawRatio.toFixed(2)}:1 → corregido {shownRatio.toFixed(2)}:1
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
