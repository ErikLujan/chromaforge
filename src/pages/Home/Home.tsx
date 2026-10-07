import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '@/hooks/useSeo';
import { useSpotlight } from '@/hooks/useSpotlight';
import { useReveal } from '@/hooks/useReveal';
import { useHeroSpotlight } from '@/hooks/useHeroSpotlight';
import { useAuthStore } from '@/store/useAuthStore';
import AuroraField from '@/components/background/AuroraField';
import MiniForja from '@/components/landing/MiniForja';
import { getDefaultPalette } from '@/components/landing/forjaDefaults';
import type { BrandPalette } from '@/utils/color.utils';
import SectionTrust from './sections/SectionTrust';
import SectionHow from './sections/SectionHow';
import SectionPsychology from './sections/SectionPsychology';
import SectionContrastLab from './sections/SectionContrastLab';
import SectionSystem from './sections/SectionSystem';
import SectionShowcase from './sections/SectionShowcase';
import SectionBrandBook from './sections/SectionBrandBook';
import SectionConversion from './sections/SectionConversion';
import styles from './Home.module.scss';

/**
 * Split-text word sequence for the hero entrance.
 *
 * Direction contract (Batch 2 — interactive entry point):
 *   THESIS:        the landing proves instead of promising — a guest forges
 *                  a real verified system beside the headline, rehearses one
 *                  questionnaire vote in a ledger, and tests AA in a lab.
 *                  No centered brochure stack, no feature cards.
 *   OWN-WORLD:     obsidian ground, HIGH-visibility dot grid + platinum
 *                  wash + cursor spotlight (decorative, hero-scoped), live
 *                  canvas aurora tinted by the primary, monochrome
 *                  instruments; generated color owns every hue.
 *   STORY:         a brand owner reads one left-aligned promise, moves a
 *                  tone, follows the vote-to-system ledger, verifies
 *                  contrast, and reaches for the questionnaire — or returns
 *                  straight to their panel.
 *   FIRST VIEWPORT: asymmetric 7/5 split (copy / MiniForja) over the layered
 *                  field; split-text word rise (28ms stagger) on H1 + sub,
 *                  block rise on kicker/CTAs/meta/panel; stacked
 *                  copy-over-instrument on mobile, zero overflow to 320px.
 *                  Proof sections scroll below.
 *   FORM:          local-state instruments plus auth-resolved CTA pair;
 *                  background decorative and pointer-transparent, reduced
 *                  motion renders static dots + wash, scroll reveals play once.
 *
 * The background layer is decorative (aria-hidden) and pointer-transparent;
 * the hero and its controls remain fully interactive. CTA spotlight positions
 * ride CSS custom properties (`--spot-x` / `--spot-y`) updated on
 * pointermove — no re-renders, opacity-only reveals. Split-text words are
 * aria-hidden spans under an aria-labelled parent so screen readers hear
 * each sentence once; the single H1 stays intact.
 *
 * @param {object} props Split-text configuration.
 * @param {string} props.text Sentence to split on spaces (stable copy).
 * @param {number} props.baseDelayMs First-word delay; +28ms per next word.
 * @param {string} [props.innerClassName] Extra class for each word.
 * @returns {JSX.Element} The masked word sequence.
 */
function SplitWords({
  text,
  baseDelayMs,
  innerClassName,
}: {
  readonly text: string;
  readonly baseDelayMs: number;
  readonly innerClassName?: string;
}) {
  const words = text.split(' ');
  return (
    <>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className={styles.mask} aria-hidden="true">
          <span
            className={innerClassName ? `${styles.word} ${innerClassName}` : styles.word}
            style={{ transitionDelay: `${baseDelayMs + index * 28}ms` }}
          >
            {word}
          </span>
          {index < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </>
  );
}

/**
 * ChromaForge home page — Hero-forja plus product proof.
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

  // WHY: one arming drives the whole first viewport — split-text words,
  // block rises, and the panel share this revealed flag, staggered by delay.
  // afterSplash holds the observer until the boot veil leaves the DOM, so
  // the once-only entrance replays visibly instead of firing covered.
  const { ref: heroRef, revealed: heroRevealed } = useReveal<HTMLElement>({ afterSplash: true });
  const spotRef = useHeroSpotlight(heroRef);

  return (
    <div className={styles.page}>
      <section
        ref={heroRef}
        data-revealed={heroRevealed || undefined}
        className={styles.hero}
        aria-labelledby="home-headline"
      >
        <div className={styles.bg} aria-hidden="true">
          <AuroraField tintColor={livePalette?.primary} />
          <div className={styles.wash} />
          <div className={styles.dots} />
          <div ref={spotRef} className={styles.spot} />
        </div>

        <div className={styles.container}>
          <div className={styles.grid}>
            <div className={styles.copy}>
              <p className={`${styles.kicker} ${styles.rise}`} style={{ transitionDelay: '0ms' }}>
                Motor de identidad algorítmica
              </p>
              <h1
                id="home-headline"
                className={styles.headline}
                aria-label="Convierte la idea de tu marca en una identidad visual."
              >
                <SplitWords text="Convierte la idea de tu marca en una" baseDelayMs={80} />{' '}
                <span className={styles.mask} aria-hidden="true">
                  <span
                    className={`${styles.word} ${styles.accentText}`}
                    style={{ transitionDelay: '304ms' }}
                  >
                    identidad visual.
                  </span>
                </span>
              </h1>

              <p
                className={styles.description}
                aria-label="Mueve un tono y observa cómo el motor forja un sistema cromático completo, verificado en contraste AA. Sin cuenta, sin espera."
              >
                <SplitWords
                  text="Mueve un tono y observa cómo el motor forja un sistema cromático completo, verificado en contraste AA. Sin cuenta, sin espera."
                  baseDelayMs={360}
                />
              </p>

              {isLoading ? (
                <div className={styles.ctaGroup} aria-hidden="true">
                  <span className={styles.ctaPlaceholder} />
                  <span className={styles.ctaPlaceholder} />
                </div>
              ) : (
                <div className={`${styles.ctaGroup} ${styles.rise}`} style={{ transitionDelay: '960ms' }}>
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

              <p className={`${styles.meta} ${styles.rise}`} style={{ transitionDelay: '1050ms' }}>
                08 preguntas · ~2 minutos · Contraste AA verificado
              </p>
            </div>

            <div className={`${styles.panel} ${styles.rise}`} style={{ transitionDelay: '250ms' }}>
              <MiniForja onPaletteChange={handlePaletteChange} />
            </div>
          </div>
        </div>
      </section>

      <SectionTrust />
      <SectionHow />
      <SectionPsychology />
      <SectionContrastLab palette={displayPalette} />
      <SectionSystem palette={displayPalette} />
      <SectionShowcase />
      <SectionBrandBook palette={displayPalette} />
      <SectionConversion />
    </div>
  );
}
