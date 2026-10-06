import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '@/hooks/useSeo';
import { useSpotlight } from '@/hooks/useSpotlight';
import { useAuthStore } from '@/store/useAuthStore';
import AuroraField from '@/components/background/AuroraField';
import MiniForja from '@/components/landing/MiniForja';
import { getDefaultPalette } from '@/components/landing/forjaDefaults';
import type { BrandPalette } from '@/utils/color.utils';
import SectionPsychology from './sections/SectionPsychology';
import SectionContrastLab from './sections/SectionContrastLab';
import SectionSystem from './sections/SectionSystem';
import SectionBrandBook from './sections/SectionBrandBook';
import SectionConversion from './sections/SectionConversion';
import styles from './Home.module.scss';

/**
 * ChromaForge home page — Hero-forja plus product proof.
 *
 * Direction contract (Batch 2 — interactive entry point):
 *   THESIS:        the landing proves instead of promising — a guest forges
 *                  a real verified system beside the headline, rehearses one
 *                  questionnaire vote in a ledger, and tests AA in a lab.
 *                  No centered brochure stack, no feature cards.
 *   OWN-WORLD:     obsidian ground, 40%-dimmed aurora tinted by the live
 *                  primary, monochrome instruments; generated color owns
 *                  every hue.
 *   STORY:         a brand owner reads one left-aligned promise, moves a
 *                  tone, follows the vote-to-system ledger, verifies
 *                  contrast, and reaches for the questionnaire — or returns
 *                  straight to their panel.
 *   FIRST VIEWPORT: asymmetric 7/5 split (copy / MiniForja) over the dimmed
 *                  field; stacked copy-over-instrument on mobile, zero
 *                  overflow down to 320px. Proof sections scroll below.
 *   FORM:          local-state instruments plus auth-resolved CTA pair;
 *                  background decorative and pointer-transparent, reduced
 *                  motion renders one static wash, scroll reveals play once.
 *
 * The background layer is decorative (aria-hidden) and pointer-transparent;
 * the hero and its controls remain fully interactive. CTA spotlight positions
 * ride CSS custom properties (`--spot-x` / `--spot-y`) updated on
 * pointermove — no re-renders, opacity-only reveals.
 *
 * @returns {JSX.Element} The rendered landing page.
 */
export default function Home() {
  useSeo('home');

  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = user !== null;

  const [livePalette, setLivePalette] = useState<BrandPalette | null>(null);
  const [defaultPalette] = useState<BrandPalette>(getDefaultPalette);
  const displayPalette = livePalette ?? defaultPalette;

  /**
   * Receives each forged palette so the aurora and the lab read the live
   * system.
   *
   * @param {BrandPalette} palette The freshly forged system.
   * @returns {void}
   */
  const handlePaletteChange = useCallback((palette: BrandPalette) => {
    setLivePalette(palette);
  }, []);

  const primaryTo = isAuthenticated ? '/dashboard' : '/quiz';
  const primaryLabel = isAuthenticated ? 'Continuar al panel' : 'Comenzar cuestionario';
  const secondaryTo = isAuthenticated ? '/brands' : '/docs';
  const secondaryLabel = isAuthenticated ? 'Mis marcas' : 'Ver documentación';

  const handleSpotlightMove = useSpotlight<HTMLAnchorElement>();

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-headline">
        <div className={styles.bg} aria-hidden="true">
          <AuroraField tintColor={livePalette?.primary} />
        </div>

        <div className={styles.container}>
          <div className={styles.grid}>
            <div className={styles.copy}>
              <p className={styles.kicker}>Motor de identidad algorítmica</p>
              <h1 id="home-headline" className={styles.headline}>
                Convierte la idea de tu marca en una{' '}
                <span className={styles.accentText}>identidad visual.</span>
              </h1>

              <p className={styles.description}>
                Mueve un tono y observa cómo el motor forja un sistema cromático
                completo, verificado en contraste AA. Sin cuenta, sin espera.
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

              <p className={styles.meta}>
                08 preguntas · ~2 minutos · Contraste AA verificado
              </p>
            </div>

            <div className={styles.panel}>
              <MiniForja onPaletteChange={handlePaletteChange} />
            </div>
          </div>
        </div>
      </section>

      <SectionPsychology />
      <SectionContrastLab palette={displayPalette} />
      <SectionSystem palette={displayPalette} />
      <SectionBrandBook palette={displayPalette} />
      <SectionConversion />
    </div>
  );
}
