import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '@/store/useAuthStore';
import { useReveal } from '@/hooks/useReveal';
import styles from './SectionConversion.module.scss';

/**
 * SectionConversion — quiet contextual close (Section 06).
 *
 * Direction contract (Batch 3 — the anchored end):
 *   THESIS:        the page ends where it began — one promise, one action,
 *                  resolved from auth state. No noise after the proof.
 *   OWN-WORLD:     centered quiet band behind a hairline; generous air,
 *                  tight group; the final primary slab on the page.
 *   STORY:         a visitor who scrolled through every proof meets a calm
 *                  door: start the questionnaire, or step back into the
 *                  panel.
 *   FIRST VIEWPORT: never the first viewport — the close below the book;
 *                  one gentle reveal, then stillness.
 *   FORM:          auth-aware primary action plus a tertiary text link
 *                  (deliberately not a second ghost button).
 *
 * @returns {JSX.Element} The rendered close section.
 */
export default function SectionConversion() {
  const { ref, revealed } = useReveal<HTMLDivElement>();

  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = user !== null;

  const primaryTo = isAuthenticated ? '/dashboard' : '/quiz';
  const primaryLabel = isAuthenticated ? 'Continuar al panel' : 'Comenzar cuestionario';
  const tertiaryTo = isAuthenticated ? '/brands' : '/docs';
  const tertiaryLabel = isAuthenticated ? 'Mis marcas' : 'Ver documentación';

  return (
    <section className={styles.section} aria-labelledby="conversion-heading">
      <div
        className={styles.inner}
        ref={ref}
        data-revealed={revealed || undefined}
      >
        <h2 id="conversion-heading" className={clsx(styles.title, styles.revealItem)} style={{ transitionDelay: '0ms' }}>
          Forja la identidad de tu marca.
        </h2>
        <p className={clsx(styles.meta, styles.revealItem)} style={{ transitionDelay: '90ms' }}>08 preguntas · ~2 minutos · Contraste AA verificado</p>
        {isLoading ? (
          <span className={clsx(styles.ctaPlaceholder, styles.revealItem)} style={{ transitionDelay: '180ms' }} aria-hidden="true" />
        ) : (
          <div className={clsx(styles.actions, styles.revealItem)} style={{ transitionDelay: '180ms' }}>
            <Link to={primaryTo} className={styles.primaryCta}>
              {primaryLabel}
            </Link>
            <Link to={tertiaryTo} className={styles.tertiaryLink}>
              {tertiaryLabel}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
