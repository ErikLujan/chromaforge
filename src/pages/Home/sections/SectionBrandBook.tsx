import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import type { BrandPalette } from '@/utils/color.utils';
import { useReveal } from '@/hooks/useReveal';
import styles from './SectionBrandBook.module.scss';

/**
 * SectionBrandBook — the exportable brand book (Section 05).
 *
 * Direction contract (Batch 3 — conversion through artifact):
 *   THESIS:        the workspace output, made tangible — a fanned pile of
 *                  book pages that turns "exportar PDF" from a button label
 *                  into an object of desire.
 *   OWN-WORLD:     asymmetric editorial spread — page pile left, manifest
 *                  right; print-like stillness, physical depth from rotation
 *                  and overlap, never from glow.
 *   STORY:         a visitor sees the book their identity becomes — portada,
 *                  color, tipo, aplicaciones — and reaches for the
 *                  questionnaire to compile their own.
 *   FIRST VIEWPORT: a scroll chapter below the system band; spread and
 *                  manifest stagger in once via scroll reveal.
 *   FORM:          static CSS page miniatures (rotation + negative-margin
 *                  layering, honestly captioned as illustrative preview)
 *                  beside a manifest list and one conversion action.
 */

interface SectionBrandBookProps {
  /** The live system previewed across the book pages. */
  readonly palette: BrandPalette;
}

const CHAPTERS: readonly { readonly label: string; readonly detail: string }[] = [
  { label: 'Marca', detail: 'Portada con la identidad fechada' },
  { label: 'Colores', detail: 'Sistema cromático con valores HEX' },
  { label: 'Tipografía', detail: 'Escala tipográfica del sistema' },
  { label: 'Aplicaciones', detail: 'La identidad en contexto' },
] as const;

/**
 * Libro de marca exportable — editorial spread.
 *
 * @param {SectionBrandBookProps} props The system previewed in the book.
 * @returns {JSX.Element} The rendered section.
 */
export default function SectionBrandBook({ palette }: SectionBrandBookProps) {
  const { ref, revealed } = useReveal<HTMLDivElement>();

  return (
    <section className={styles.section} aria-labelledby="brandbook-heading">
      <div className={styles.inner} ref={ref} data-revealed={revealed || undefined}>
        <div className={clsx(styles.spread, styles.revealItem)} style={{ transitionDelay: '0ms' }}>
          <div className={styles.stack} aria-hidden="true">
            <div className={styles.page} data-page="cover">
              <span className={styles.pageEyebrow}>ChromaForge · Libro de marca</span>
              <span className={styles.pageTitle} style={{ color: palette.primary }}>
                Identidad generada
              </span>
              <span className={styles.pageMeta}>Sistema cromático · WCAG 2.1 AA</span>
              <span className={styles.pageStrip}>
                {([palette.primary, palette.secondary, palette.accent] as const).map(
                  (tone) => (
                    <span
                      key={tone}
                      className={styles.pageStripTone}
                      style={{ backgroundColor: tone }}
                    />
                  ),
                )}
              </span>
              <span className={styles.pageFolio}>01 — Marca</span>
            </div>

            <div className={styles.page} data-page="colors">
              <span className={styles.pageEyebrow}>Colores</span>
              <span className={styles.pageRows}>
                {(
                  [palette.primary, palette.secondary, palette.accent, palette.surface] as const
                ).map((tone) => (
                  <span key={tone} className={styles.pageRow}>
                    <span
                      className={styles.pageRowTone}
                      style={{ backgroundColor: tone }}
                    />
                    <span className={styles.pageRowBar} />
                  </span>
                ))}
              </span>
              <span className={styles.pageFolio}>02 — Colores</span>
            </div>

            <div className={styles.page} data-page="type">
              <span className={styles.pageEyebrow}>Tipografía</span>
              <span className={styles.pageAa} style={{ color: palette.secondary }}>
                Aa
              </span>
              <span className={styles.pageLines} aria-hidden="true">
                <span className={styles.pageLine} />
                <span className={styles.pageLine} data-short="true" />
                <span className={styles.pageLine} />
              </span>
              <span className={styles.pageFolio}>03 — Tipografía</span>
            </div>
          </div>
          <p className={styles.caption}>Vista previa ilustrativa del libro exportable.</p>
        </div>

        <div className={styles.manifest}>
          <h2 id="brandbook-heading" className={clsx(styles.title, styles.revealItem)} style={{ transitionDelay: '80ms' }}>
            El libro que cierra el sistema
          </h2>
          <p className={clsx(styles.lede, styles.revealItem)} style={{ transitionDelay: '120ms' }}>
            Cada identidad se compila en un libro de marca en PDF: portada,
            color, tipografía y aplicaciones, con su nota de contraste. Lo que
            ves aquí se dibuja con tu propio sistema en vivo.
          </p>
          <ul className={clsx(styles.chapters, styles.revealItem)} style={{ transitionDelay: '160ms' }}>
            {CHAPTERS.map((chapter) => (
              <li key={chapter.label} className={styles.chapter}>
                <span className={styles.chapterCheck} aria-hidden="true">
                  <Check size={14} />
                </span>
                <span className={styles.chapterText}>
                  <span className={styles.chapterLabel}>{chapter.label}</span>
                  <span className={styles.chapterDetail}>{chapter.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className={clsx(styles.meta, styles.revealItem)} style={{ transitionDelay: '200ms' }}>PDF · 4 capítulos · WCAG 2.1 AA</p>
          <Link to="/quiz" className={clsx(styles.cta, styles.revealItem)} style={{ transitionDelay: '200ms' }}>
            Generar mi libro
          </Link>
          <p className={clsx(styles.note, styles.revealItem)} style={{ transitionDelay: '200ms' }}>Compílalo desde tu espacio de resultados.</p>
        </div>
      </div>
    </section>
  );
}
