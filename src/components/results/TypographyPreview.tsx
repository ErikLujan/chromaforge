import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './TypographyPreview.module.scss';

/**
 * TypographyPreview — type specimen of the generated identity.
 *
 * A premium glass panel demonstrating the global ChromaForge type scale
 * (Display, Heading, Body, small metadata) against the active palette's
 * generated background and surface colors. The palette reaches the specimen
 * exclusively through CSS custom properties, so every rendered tone stays
 * dynamic with no duplicated hex values.
 */

interface TypographyPreviewProps {
  /** Brand color roles exposed as CSS custom properties on the panel root. */
  readonly style?: CSSProperties;
}

interface TypeRowProps {
  /** The scale-step name (Display, Título, Texto, Datos). */
  readonly label: string;
  /** The mono token metadata for the step (face and weight). */
  readonly meta: string;
  /** The specimen content rendered for this step. */
  readonly children: ReactNode;
}

/**
 * One step of the type scale ladder: a mono token tag on the left and the
 * specimen sample on the right (stacked on the smallest screens).
 *
 * @param {TypeRowProps} props The row configuration.
 * @returns {JSX.Element} The rendered type row.
 */
function TypeRow({ label, meta, children }: TypeRowProps) {
  return (
    <div className={styles.typeRow}>
      <span className={styles.typeTag}>
        <span className={styles.typeTagLabel}>{label}</span>
        <span className={styles.typeTagMeta}>{meta}</span>
      </span>
      <span className={styles.typeSample}>{children}</span>
    </div>
  );
}

interface SurfaceProofProps {
  /** Which generated surface the specimen is rendered on. */
  readonly surface: 'background' | 'surface';
  /** The mono caption describing the proof surface. */
  readonly label: string;
  /** The specimen content rendered on the surface. */
  readonly children: ReactNode;
}

/**
 * A proof tile that renders type directly on one of the palette's generated
 * dark surfaces, making the identity's on-color hierarchy observable.
 *
 * @param {SurfaceProofProps} props The proof configuration.
 * @returns {JSX.Element} The rendered proof tile.
 */
function SurfaceProof({ surface, label, children }: SurfaceProofProps) {
  return (
    <div
      className={clsx(
        styles.proofTile,
        surface === 'background' ? styles.proofBackground : styles.proofSurface,
      )}
    >
      <span className={styles.proofLabel}>{label}</span>
      {children}
    </div>
  );
}

/**
 * Typography preview of the generated identity.
 *
 * Presents the global type scale as a specimen ladder (Display, heading,
 * body, and mono metadata) alongside proof tiles that render the scale on the
 * palette's generated background and surface — the type hierarchy stays
 * obvious while the palette's own temperature carries the surfaces.
 *
 * @param {TypographyPreviewProps} props The preview configuration.
 * @returns {JSX.Element} The rendered typography specimen panel.
 */
export default function TypographyPreview({ style }: TypographyPreviewProps) {
  return (
    <section
      className={styles.panel}
      style={style}
      aria-label="Vista previa de tipografía"
    >
      <header className={styles.panelHeader}>
        <div className={styles.panelHeading}>
          <span className={styles.panelEyebrow}>Tipografía · Sistema de identidad</span>
          <h3 className={styles.panelTitle}>Escala tipográfica</h3>
        </div>
        <span className={styles.panelMeta}>Playfair Display · Inter · JetBrains Mono</span>
      </header>

      <div className={styles.specimenGrid}>
        <div className={styles.scale}>
          <TypeRow label="Display" meta="Playfair Display · 900">
            <span className={styles.sampleDisplay}>Diseño de marcas</span>
          </TypeRow>

          <TypeRow label="Título" meta="Inter · 600">
            <span className={styles.sampleHeading}>Sistema de identidad</span>
          </TypeRow>

          <TypeRow label="Texto" meta="Inter · 400">
            <span className={styles.sampleBody}>
              Una identidad de marca es un sistema, no un logotipo. Color,
              tipografía y forma trabajan juntos para que cada aplicación
              comunique la misma intención.
            </span>
          </TypeRow>

          <TypeRow label="Datos" meta="JetBrains Mono · 500">
            <span className={styles.sampleMeta}>AA 4.5:1 · 1.618 · 5 roles</span>
          </TypeRow>
        </div>

        <div className={styles.proofs}>
          <SurfaceProof surface="background" label="Sobre el fondo generado">
            <span className={styles.proofDisplay}>Marca</span>
            <span className={styles.proofBody}>
              El fondo profundo del sistema sostiene la escala tipográfica
              completa.
            </span>
          </SurfaceProof>

          <SurfaceProof surface="surface" label="Sobre la superficie generada">
            <span className={styles.proofDisplay}>Marca</span>
            <span className={styles.proofBody}>
              La superficie eleva los paneles un nivel por encima del fondo.
            </span>
          </SurfaceProof>
        </div>
      </div>
    </section>
  );
}