import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSpotlight } from '@/hooks/useSpotlight';
import { useAuthStore } from '@/store/useAuthStore';
import AuroraField from '@/components/background/AuroraField';
import styles from './Home.module.scss';

/**
 * ChromaForge home page hero.
 *
 * Direction contract — generation light, alive but cheap:
 *   THESIS:        the generation mechanism breathes from the first frame —
 *                  a monochrome aurora field (ghost white / silver /
 *                  graphite at 7–10% on obsidian) with the headline
 *                  floating above it.
 *   OWN-WORLD:     obsidian base + AuroraField canvas (ReactBits Aurora
 *                  inspiration, re-engineered: low-res 2D fills, no WebGL, no
 *                  blur filter, adaptive 60→30fps, paused off-screen).
 *                  Splash owns a SEPARATE static radial wash — no shared
 *                  class or keyframe.
 *   STORY:         a brand owner arrives, reads one centered promise, and
 *                  reaches for the next action — start the questionnaire when
 *                  new, or dive back into their work when returning.
 *   FIRST VIEWPORT: canvas aurora (z-index 0) behind a centered Playfair
 *                  headline; a single CTA pair resolved from auth state.
 *   FORM:          living light behind centered typography. The field loops
 *                  continuously for every visitor.
 *
 * The background layer is decorative (aria-hidden) and pointer-transparent;
 * the hero and its controls remain fully interactive. Pointer interactivity
 * is tracked on `window` (the canvas host itself stays pointer-transparent)
 * and eased inside the canvas loop, so text selection and CTAs never fight
 * the background for events. CTA spotlight positions ride CSS custom
 * properties (`--spot-x` / `--spot-y`) updated on pointermove — no
 * re-renders, opacity-only reveals.
 *
 * @returns {JSX.Element} The rendered home hero section.
 */
export default function Home() {
  useDocumentTitle('Inicio');

  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = user !== null;

  const primaryTo = isAuthenticated ? '/quiz' : '/auth';
  const primaryLabel = isAuthenticated ? 'Comenzar Cuestionario' : 'Empezar ahora';
  const secondaryTo = isAuthenticated ? '/brands' : '/docs';
  const secondaryLabel = isAuthenticated ? 'Mis Marcas' : 'Ver documentación';

  const handleSpotlightMove = useSpotlight<HTMLAnchorElement>();

  return (
    <section className={styles.hero}>
      <div className={styles.bg} aria-hidden="true">
        <AuroraField />
      </div>

      <div className={styles.container}>
        <div className={styles.text}>
          <h1 className={styles.headline}>
            Convierte la idea de tu marca en una{' '}
            <span className={styles.accentText}>identidad visual.</span>
          </h1>

          <p className={styles.description}>
            Responde un breve cuestionario y obtén una propuesta visual 
            coherente de colores, tipografías y composición, lista para usar.
          </p>

          {isLoading ? (
            <div className={styles.ctaGroup} aria-hidden="true">
              <span className={styles.ctaPlaceholder} />
              <span className={styles.ctaPlaceholder} />
            </div>
          ) : (
            <div className={styles.ctaGroup}>
              <Link
                to={primaryTo}
                className={styles.primaryCta}
                onPointerMove={handleSpotlightMove}
              >
                {primaryLabel}
              </Link>
              <Link
                to={secondaryTo}
                className={styles.secondaryCta}
                onPointerMove={handleSpotlightMove}
              >
                {secondaryLabel}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}