import { cn } from '@/utils/cn';
import { useReveal } from '@/hooks/useReveal';
import styles from './SectionTrust.module.scss';

/**
 * SectionTrust — capability strip, no logos, no metrics.
 *
 * Direction: a quiet hairline band directly below the hero that states what
 * the visitor can verify themselves — deterministic engine, no account to
 * try, AA correction, exportable book. Text-only by design: no fake logos,
 * no invented counts, no testimonials.
 *
 * @returns {JSX.Element} The rendered trust strip section.
 */
export default function SectionTrust() {
  const { ref, revealed } = useReveal<HTMLDivElement>();

  return (
    <section className={styles.section} aria-labelledby="trust-heading">
      <div className={styles.inner} ref={ref} data-revealed={revealed || undefined}>
        <h2 id="trust-heading" className={cn(styles.title, styles.revealItem)}>
          Hecho para decidir, no para prometer
        </h2>
        <dl className={cn(styles.strip, styles.revealItem)} style={{ transitionDelay: '90ms' }}>
          <div className={styles.item}>
            <dt className={styles.term}>Motor determinista</dt>
            <dd className={styles.detail}>La misma entrada forja el mismo sistema.</dd>
          </div>
          <div className={styles.item}>
            <dt className={styles.term}>Prueba sin cuenta</dt>
            <dd className={styles.detail}>La mini-forja de arriba usa el motor real.</dd>
          </div>
          <div className={styles.item}>
            <dt className={styles.term}>Contraste AA</dt>
            <dd className={styles.detail}>Cada rol legible se corrige sobre su superficie.</dd>
          </div>
          <div className={styles.item}>
            <dt className={styles.term}>Libro en PDF</dt>
            <dd className={styles.detail}>Marca, color, tipo y aplicaciones en un libro.</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
