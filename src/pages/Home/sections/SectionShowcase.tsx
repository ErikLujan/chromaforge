import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { isTextReadable } from '@/utils/color.utils';
import type { BrandPalette } from '@/utils/color.utils';
import { forgeInstrumentPalette } from '@/components/landing/forjaDefaults';
import { useReveal } from '@/hooks/useReveal';
import styles from './SectionShowcase.module.scss';

interface ShowcaseExample {
  readonly id: string;
  readonly caption: string;
  readonly recipe: string;
  readonly palette: BrandPalette;
}

/**
 * Fixed showcase recipes — deterministic engine outputs, honestly labeled.
 *
 * Each palette is forged at module load through the shipped
 * `forgeInstrumentPalette` engine (same math as MiniForja). Labels describe
 * the recipe (base hue + harmony), never invented brand names, metrics, or
 * screenshots. Replaceable: swap any entry for a saved identity without
 * touching the layout.
 */
const EXAMPLES: readonly ShowcaseExample[] = [
  {
    id: 'analogous-deep',
    caption: 'Ejemplo — base 212° · análogo · profundo',
    recipe: 'Equilibrado · superficie profunda',
    palette: forgeInstrumentPalette(212, 'balanced', 'deep', 'analogous'),
  },
  {
    id: 'complementary-twilight',
    caption: 'Ejemplo — base 28° · complementario · crepúsculo',
    recipe: 'Sutil · superficie intermedia',
    palette: forgeInstrumentPalette(28, 'muted', 'twilight', 'complementary'),
  },
  {
    id: 'triadic-deep',
    caption: 'Ejemplo — base 160° · triádico · profundo',
    recipe: 'Vibrante · superficie profunda',
    palette: forgeInstrumentPalette(160, 'vibrant', 'deep', 'triadic'),
  },
];

/**
 * SectionShowcase — bento grid of real engine outputs.
 *
 * Direction: asymmetric bento (lead card tall, two stacked) over the
 * obsidian ground. Each card renders a live miniature of its palette —
 * header on background, body on surface, accent action — plus its HEX
 * readout and AA verdict. Explicitly captioned as illustrative examples.
 *
 * @returns {JSX.Element} The rendered showcase section.
 */
export default function SectionShowcase() {
  const { ref, revealed } = useReveal<HTMLDivElement>();

  return (
    <section className={styles.section} aria-labelledby="showcase-heading">
      <div className={styles.inner} ref={ref} data-revealed={revealed || undefined}>
        <div className={styles.head}>
          <h2 id="showcase-heading" className={cn(styles.title, styles.revealItem)}>
            Sistemas forjados con el motor
          </h2>
          <p className={cn(styles.lede, styles.revealItem)} style={{ transitionDelay: '90ms' }}>
            Tres salidas reales del motor de forja, con su receta a la vista.
            Ejemplos ilustrativos — la tuya se forja en el cuestionario.
          </p>
        </div>

        <ul className={styles.grid}>
          {EXAMPLES.map((example, index) => {
            const primaryOk = isTextReadable(example.palette.primary, example.palette.surface);
            return (
              <li
                key={example.id}
                className={cn(styles.card, styles.revealItem)}
                style={{ transitionDelay: `${180 + index * 90}ms` }}
                data-lead={example.id === 'analogous-deep' || undefined}
              >
                <div
                  className={styles.preview}
                  style={{ backgroundColor: example.palette.background }}
                >
                  <p className={styles.previewKicker} style={{ color: example.palette.secondary }}>
                    {example.recipe}
                  </p>
                  <p className={styles.previewTitle} style={{ color: example.palette.primary }}>
                    Identidad en contexto
                  </p>
                  <div
                    className={styles.previewSurface}
                    style={{ backgroundColor: example.palette.surface }}
                  >
                    <p className={styles.previewBody} style={{ color: example.palette.secondary }}>
                      Titular y texto sobre la superficie del sistema.
                    </p>
                    <span
                      className={styles.previewAction}
                      style={{
                        backgroundColor: example.palette.accent,
                        color: example.palette.background,
                      }}
                      aria-hidden="true"
                    >
                      Acción de acento
                    </span>
                  </div>
                </div>

                <div className={styles.meta}>
                  <p className={styles.caption}>{example.caption}</p>
                  <p className={styles.hexes} aria-label={`Valores HEX de ${example.caption}`}>
                    <code>{example.palette.primary}</code>
                    <code>{example.palette.secondary}</code>
                    <code>{example.palette.accent}</code>
                  </p>
                  <p className={styles.verdict} role="status">
                    Primario sobre superficie ·{' '}
                    {primaryOk ? 'AA superado' : 'sin AA'} ·{' '}
                    <span className={styles.aaDot} data-pass={primaryOk || undefined} aria-hidden="true" />
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <p className={cn(styles.note, styles.revealItem)} style={{ transitionDelay: '450ms' }}>
          Ejemplos ilustrativos forjados con el motor — reemplázalos con
          identidades guardadas cuando existan.{' '}
          <Link to="/quiz" className={styles.noteLink}>
            Forjar la mía
          </Link>
        </p>
      </div>
    </section>
  );
}
